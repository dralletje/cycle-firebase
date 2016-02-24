import chai, {expect} from 'chai'
import spies from 'chai-spies'
// import mockery from 'mockery'
import {Observable} from 'rx'

// import firebase from 'exothermic'

chai.use(spies)
// Two 'global' spies
// let pushId = chai.spy(() => `PUSHID_GENERATED_YESSS`)

// Mock the getChanges module, and explicitly allow the other imports
// mockery.registerMock(`./pushId`, pushId)
// mockery.enable({
//   warnOnReplace: false,
//   warnOnUnregistered: false,
// })

let {makeFirebaseDriver} = require(`../src/firebase`)

let trimPath = path => {
  return path
  .replace(/\/+/g, `/`)
  .replace(/^\/+/, ``)
}

describe(`Source`, () => {
  let on = chai.spy()
  let off = chai.spy()

  let onAuth = chai.spy()
  let offAuth = chai.spy()

  let getSource = () => {
    let makeChild = location => {
      return {
        _location: location,
        child: sub => makeChild(`${location}/${sub}`),
        on: (...args) => {
          on(location, ...args)
          return args[1] // Return listener
        },
        off: (...args) => off(location, ...args),
        onAuth, offAuth,
      }
    }
    return makeFirebaseDriver(makeChild(``))(Observable.empty())
  }

  // Reset the spies as they are not local to each test
  beforeEach(() => {
    on.reset()
    off.reset()
    onAuth.reset()
    offAuth.reset()
  })


  it(`should be able to generate one pushId$`, () => {
    let source = getSource()
    let onNext = chai.spy()
    let onCompleted = chai.spy()
    source.pushId$.subscribe({ onNext, onCompleted })

    expect(onNext).to.be.called.once()
    expect(onNext.__spy.calls[0][0].length).to.eql(20)
    expect(onCompleted).to.be.called.once()
  })

  it(`should be able to generate two different pushId$s`, () => {
    let source = getSource()
    expect(source.$set({ value: 1 })).to.eql({ $set: { value: 1 }})
  })

  it(`should listen to a node with .get`, () => {
    let source = getSource()
    let spy = chai.spy()

    source.get(`nested/location`).subscribe(spy)

    expect(on).to.be.called.once()
    expect(
      trimPath(on.__spy.calls[0][0])
    ).to.eql(`nested/location`)
    expect(on.__spy.calls[0][1]).to.eql(`value`)
    let callback = on.__spy.calls[0][2]
    callback({ val: () => `VALUE` })
    expect(spy).to.be.called.once.with(`VALUE`)
  })

  it(`should unlisten when stopped observing`, () => {
    let source = getSource()
    let subscription = source.get(`nested/location`).subscribe(() => {})

    let callback = on.__spy.calls[0][2]
    subscription.dispose()

    expect(off.__spy.calls[0][1]).to.eql(`value`)
    expect(off.__spy.calls[0][2]).to.eql(callback)
  })

  it(`should error the observable on firebase error`, () => {
    let source = getSource()
    let spy = chai.spy()
    let error = new Error(`With stuff`)

    source.get(`nested/location`).subscribe({
      onNext: Function.prototype,
      onError: spy,
    })
    let errorCallback = on.__spy.calls[0][3]
    errorCallback(error)

    expect(spy).to.be.called.once.with(error)
  })

  it(`can get a value of a scoped child`, () => {
    let source = getSource()
    let spy = chai.spy()

    source.child(`nested/location`)
      .get(`nested/location`)
      .subscribe(spy)

    expect(
      trimPath(on.__spy.calls[0][0])
    ).to.eql(`nested/location/nested/location`)
    expect(on.__spy.calls[0][1]).to.eql(`value`)
    let callback = on.__spy.calls[0][2]
    callback({ val: () => `VALUE` })
    expect(spy).to.be.called.once.with(`VALUE`)
  })

  it(`should throw for .child without argument`, () => {
    let source = getSource()

    expect(() => {
      source.child()
    }).to.throw()

    expect(() => {
      source.child(1)
    }).to.throw()
  })

  it(`should have root.ref return a firebase ref`, () => {
    let source = getSource()
    let ref = source.ref()
    expect(trimPath(ref._location)).to.eql(``)
  })

  it(`should have child.ref return a firebase ref`, () => {
    let source = getSource()
    let ref = source.child(`nested/location`).ref()
    expect(trimPath(ref._location)).to.eql(`nested/location`)
  })
})
