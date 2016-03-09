const makeFirebaseDriver = require(`../src/firebase`).makeFirebaseDriver
const Firebase = require(`firebase`)
const Cycle = require(`@cycle/core`)
const {Observable, Subject} = require(`rx`)

const chalk = require(`chalk`)

const main = (drivers) => {
  let {firebase, stdio} = drivers

  // Because I am not yet capable of thinking full-cycle,
  // I am using a redux ripoff here ^^
  let initialState = {
    step: `loginOrRegister`,
    username: null,
    password: null,
    register: null,
  }
  let actions$ = new Subject()
  let dispatch = (type, payload) => actions$.onNext({ type, payload })
  let state$ = actions$
    .startWith({ type: `@@INIT` })
    .scan((state, {type, payload}) => {
      switch (type) {
      case `ERROR`:
        return initialState

      case `INPUT_HASACCOUNT`:
        return {
          ...state,
          step: `username`,
          register: !payload,
        }

      case `INPUT_USERNAME`:
        return {
          ...state,
          step: `password`,
          username: payload,
        }

      case `INPUT_PASSWORD`:
        return {
          ...state,
          step: `finished`,
          password: payload,
        }

      default:
        return state
      }
    }, initialState)
    .shareReplay(1)

  // Get login and error messages from firebase
  let uid$ = firebase.get(`$user/uid`).filter(uid => uid !== null)
    .map(x => chalk.green(`[LOGGED IN] UID: ${x}`))
  let errors$ = firebase.get(`$lastError`)
    .do(x => setTimeout(() => dispatch(`ERROR`, x.message), 500))
    .map(x => chalk.red(`[LOGIN ERROR] ${x.message}\n`))

  // Update the state based on the user input
  stdio.lines$
  .withLatestFrom(state$, (line, state) => ({line, state}))
  .subscribe(({line, state}) => {
    switch (state.step) {
    case `loginOrRegister`:
      let answer = line.toLowerCase()
      if (answer === `y` || answer === `n`) {
        dispatch(`INPUT_HASACCOUNT`, answer === `y`)
      }
      break

    case `username`:
      dispatch(`INPUT_USERNAME`, line)
      break

    case `password`:
      dispatch(`INPUT_PASSWORD`, line)
      break

    default:
      break
    }
  })

  // When we are not finished, show the next prompt to the user
  let loginMessages$ = state$
    .filter(state => state.step !== `finished`)
    .map(state => {
      let cursor = chalk.white(`\n> `)

      switch (state.step) {
      case `loginOrRegister`:
        return `\nDo you already have an account? [y/n]` + cursor
      case `username`:
        return `\nAlright, what is your username?` + cursor
      case `password`:
        return `\nPassword, please?` + cursor
      default:
        // This should never happend
        throw new Error(`Nope!`)
      }
    })

  // Derive a fb user value from the state
  let fbUser$ = state$
    .filter(state => {
      return state.username && state.password && state.required !== null
    })
    .map(state => {
      return {
        type: `password`,
        email: state.username,
        password: state.password,
        create: state.register,
      }
    })
    .startWith(null)

  return {
    // Use combineLatest here, as that is pretty much always what
    // you'll want, even though I am using only one here
    firebase: Observable.combineLatest(
      fbUser$,
      (fbUser) => {
        return {
          $user: firebase.$set(fbUser),
        }
      }
    ),

    // Merge here, because it is not a hierarchy but a stream
    stdio: Observable.merge(loginMessages$, uid$, errors$),
  }
}

Cycle.run(main, {
  // My example firebase db
  firebase: makeFirebaseDriver(new Firebase(`https://redditcycle.firebaseIO.com`)),

  // Simple standard input/ouput driver for user interaction
  stdio: $sources => {
    // Write every message coming in
    $sources.subscribe(x => process.stdout.write(x))

    // Observable over lines typed by the user
    let lines$ = Observable.create(observer => {
      let listener = () => {
        let data = process.stdin.read()
        if (data !== null) {
          observer.onNext(data.toString().trim())
        }
      }
      process.stdin.on(`readable`, listener)

      return () => {
        process.stdin.removeListener(`readable`, listener)
      }
    })
    .share()

    return { lines$ }
  },
})
