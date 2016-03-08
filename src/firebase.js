import {Observable} from 'rx'
import Firebase from 'firebase'

import getChanges from './getChanges'
import pushId from './pushId'

// Observe an event by eventName on a firebase ref.
// No magic or .val unpacking is done, just listening
// and firing when being triggered.
const observe = (ref, event) => {
  return Observable.create(observer => {
    // Start listening to the event
    const unbind = ref.on(event,
      x => observer.onNext(x),
      err => observer.onError(err)
    )

    // Stop listening on dispose
    return () => {
      ref.off(event, unbind)
    }
  })
}

// Use the `observe(ref, event)` to observe the value of a ref,
// and unpack it so it's just a normal javascript object.
const getValue = (ref) => observe(ref, `value`).map(x => x.val())

// Because firebase doesn't store this on /user or /uid or a custom event,
// we need a full blown new function that uses .onAuth instead of .on 😒
const uid = (ref) => {
  return Observable.create(observer => {
    const cb = (auth) => {
      observer.onNext(auth ? auth.uid : null)
    }
    // Start listening
    ref.onAuth(cb)

    // Unlisten on dispose
    return () => {
      ref.offAuth(cb)
    }
  })
}

function makeFirebaseDriver(_baseRef) {
  // If the 'baseref' passed in is a string, we initialize the firebase ref ourselves
  let baseRef =
    typeof _baseRef === `string`
    ? new Firebase(_baseRef)
    : _baseRef

  return function timeDriver(source$) {
    source$
    // Start with no changes at all
    .startWith({})
    // Pairwise so we can compare every tree with the previous
    .pairwise()
    // Get a list of actions to transition to the next state
    .map(([prevState, nextState]) => getChanges(prevState, nextState))
    // Apply every of these changes to the baseref
    .subscribe(changes => {
      changes.forEach(({location, value}) => {
        baseRef.child(location).set(value)
      })
    })

    // Get an observable over the current uid of the user
    let uid$ = uid(baseRef)

    // Get an observable that will complete with one random ID
    let pushId$ = Observable.create(observer => {
      observer.onNext(pushId())
      observer.onCompleted()
      return () => {}
    })

    // Small utility to wrap objects in a 'set' object
    let $set = object => {
      return { $set: object }
    }

    // Prevents errors when getting using an empty path
    let getFbChild = (ref, location) =>
      location === `` ? ref : ref.child(location)

    let createChild = (path) => {
      return {
        /*
        Methods based on current path
        */
        // Get an observable over value on current or sub-path
        get: (childPath = ``) => getValue(getFbChild(baseRef, `${path}/${childPath}`)),

        // Get an object like this, scoped to the path specified
        child: childPath => {
          if (typeof childPath !== `string`) {
            throw new Error(`Required argument to .child has to be a string.`)
          }
          return createChild(`${path}/${childPath}`)
        },

        // Get the raw firebase ref of the current path
        ref: () => getFbChild(baseRef, path),

        /*
        Methods without relation to the current path
        */

        uid$, $set, pushId$,
        // Get an observable over a value of a custom query
        value: getValue,
        // Get an observable over a custom event of a custom query
        observe,
      }
    }

    return createChild(``)
  }
}

module.exports = {
  /**
   * Firebase Driver factory.
   *
   * This is a function which, when called, returns a Firebase Driver for Cycle.js
   * apps. The driver is also a function, and it takes an Observable of data trees,
   * as input to send to the remote DB and returns an object with methods to
   * retrieve observables of values in the remote DB.
   *
   * **Requests**. Will compare the objects passed into this (starting with an
   * empty one), and send changes between them to firebase. It does so by treating
   * everything else than an object as a value to set, and thereby not overwriting
   * any of it's parents. Only when an object with a single key `$set` is encoutered,
   * it will use the value on that key to overwrite the data on that location,
   * even if it is an (deep) object.
   *
   * **Responses**. An object with properties `get`, `child` and `uid$` to create
   * firebase value observables.
   * ### `get(location)`
   * Will return an observable, mapping to the value at location `location` in the
   * remote firebase database.
   * ### `uid$`
   * An observable over the uid$ of the current logged in user.
   * directly after calling (differs from `setInterval`), no initial timeout.
   * ### `child(location)`
   * Created a object like the normal driver, but with only access to the data
   * at and in `location`. This allows you to pass certain parts to used dataflow
   * components.
   *
   * @param {String} Firebase url to use as base
   * @return {Function} the Firebase Driver function
   * @function makeFirebaseDriver
   */
  makeFirebaseDriver,
}
