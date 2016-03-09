import chai, {expect} from 'chai'
import spies from 'chai-spies'
import mockery from 'mockery'
import {Observable} from 'rx'

// import firebase from 'exothermic'

chai.use(spies)
// Two 'global' spies
let getChanges = chai.spy((a, b) => [b])
let handleAuthentication = chai.spy(data => [
  function mockFunctionToCallAuthWithCustomToken(...args) {
    return this.authWithCustomToken(...args)
  }, data.token,
])

// Mock the getChanges and handleAuthentication module, and explicitly allow the other imports
mockery.registerMock(`./getChanges`, getChanges)
mockery.registerMock(`./handleAuthentication`, handleAuthentication)
mockery.enable({
  warnOnReplace: false,
  warnOnUnregistered: false,
})

let {makeFirebaseDriver} = require(`../src/firebase`)

describe(`Sinks`, () => {
  let runSink = (items) => {
    let firebaseSet = chai.spy()
    let firebaseTokenAuth = chai.spy()

    // Pass in mock baseref that only has .child, .set and .authWithCustomToken, and on
    // .set it will call the firebaseSet spy, so we can inspect that
    let firebase = {
      child: path => ({
        set: value => firebaseSet(path, value),
      }),
      authWithCustomToken: firebaseTokenAuth,
    }

    makeFirebaseDriver(firebase)(Observable.from(items))
    return { firebaseSet, firebaseTokenAuth }
  }

  // Reset the spies as they are not local to each test
  beforeEach(() => {
    getChanges.reset()
    handleAuthentication.reset()
  })

  it(`should get incoming change`, () => {
    let {firebaseSet} = runSink([
      { location: ``, value: 1 },
    ])
    expect(getChanges).to.be.called.with({}, { location: ``, value: 1 })
    expect(firebaseSet).to.be.called.with(``, 1)
  })

  it(`should get my multiple incoming changes`, () => {
    let {firebaseSet} = runSink([
      { location: ``, value: 1 },
      { location: `what`, value: 2 },
    ])

    expect(getChanges).to.be.called.with({}, { location: ``, value: 1 })
    expect(firebaseSet).to.be.called.with(``, 1)

    expect(getChanges).to.be.called.with({ location: ``, value: 1 }, { location: `what`, value: 2 })
    expect(firebaseSet).to.be.called.with(`what`, 2)
  })

  it(`should login using handleAuthentication`, () => {
    let {firebaseTokenAuth} = runSink([
      { location: `$user`, value: {
        type: `token`,
        token: `asdf`,
      }},
    ])

    expect(handleAuthentication).to.be.called.with({
      type: `token`,
      token: `asdf`,
    })
    expect(firebaseTokenAuth).to.be.called.with(`asdf`)
  })

  it(`should error when setting deep in login`, () => {
    expect(() => {
      runSink([
        { location: `$user/type`, value: `type` },
      ])
    }).to.throw()
  })
})
