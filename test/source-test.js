// Didn't do any tests for the sources, will do that in a couple
// of days... I promise!

import chai, {expect} from 'chai'
import spies from 'chai-spies'
import mockery from 'mockery'
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

describe(`Source`, () => {
  let getSource = () => {
    return makeFirebaseDriver({})(Observable.empty())
  }

  // Reset the spies as they are not local to each test
  beforeEach(() => {
    // pushId.reset()
  })

  it(`should be able to generate random pushId$`, () => {
    let source = getSource()
    let onNext = chai.spy()
    let onCompleted = chai.spy()
    source.pushId$.subscribe({ onNext, onCompleted })
    //expect(pushId).to.be.called()
    expect(onNext).to.be.called.once()
    expect(onNext.__spy.calls[0][0].length).to.eql(20)
    expect(onCompleted).to.be.called.once()
  })
})
