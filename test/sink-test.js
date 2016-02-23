import chai, {expect} from 'chai'
import spies from 'chai-spies'
import mockery from 'mockery'
import {Observable} from 'rx'

// import firebase from 'exothermic'

chai.use(spies)
// Two 'global' spies
let getChanges = chai.spy((a, b) => [b])
let firebaseSet = chai.spy()

// Mock the getChanges module, and explicitly allow the other imports
mockery.registerMock(`./getChanges`, getChanges)
mockery.enable({
  warnOnReplace: false,
  warnOnUnregistered: false,
})

let {makeFirebaseDriver} = require(`../src/firebase`)

describe(`Sinks`, () => {
  let runSink = (items) => {
    // Pass in mock baseref that only has .child and .set, and on
    // .set it will call the firebaseSet spy, so we can inspect that
    let firebase = {
      child: path => ({
        set: value => firebaseSet(path, value),
      }),
    }
    return makeFirebaseDriver(firebase)(Observable.from(items))
  }

  // Reset the spies as they are not local to each test
  beforeEach(() => {
    getChanges.reset()
    firebaseSet.reset()
  })

  it(`should get incoming change`, () => {
    runSink([
      { location: ``, value: 1 },
    ])
    expect(getChanges).to.be.called.with({}, { location: ``, value: 1 })
    expect(firebaseSet).to.be.called.with(``, 1)
  })

  it(`should get my multiple incoming changes`, () => {
    runSink([
      { location: ``, value: 1 },
      { location: `what`, value: 2 },
    ])

    expect(getChanges).to.be.called.with({}, { location: ``, value: 1 })
    expect(firebaseSet).to.be.called.with(``, 1)

    expect(getChanges).to.be.called.with({ location: ``, value: 1 }, { location: `what`, value: 2 })
    expect(firebaseSet).to.be.called.with(`what`, 2)
  })
})
