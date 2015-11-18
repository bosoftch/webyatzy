/**
 * derBo's Yatzy
 * @version 0.1.0
 * @author Marco Bollmann <deepi@gmx.ch>
 */
/**
 * The main derbo namespace.
 * @namespace
 *
 */
var derbo = derbo || {};

/**
 * @namespace
 */
derbo.games = derbo.games || {};

/**
 * @namespace
 */
derbo.games.webyatzy = (function() {
  'use strict';

  /**
   * Encapsulates the Dice constructor.
   * @class
   * @public
   */
  var Dice = (function() {
    /**
     * Represents a dice from 1 to 6 in a html img tag with a png dice image.
     * @constructor
     * @memberOf derbo.games.webyatzy
     * @param {Object} imgElement An img dom-element in the html
     */
    function Dice( imgElement ) {
      this.value = 0;
      this.hold = false;
      this.imgElement = imgElement;
    }

    /**
     * Rolls the dice
     */
    Dice.prototype.roll = function() {
      if ( !this.hold ) {
        this.value = Math.floor(Math.random() * 6 + 1);
      }
    };

    /**
     * Changes the hold status; with false, the dice is not rollable.
     */
    Dice.prototype.switchHold = function() {
      this.hold = !this.hold;
    };

    /**
     * Sets the url from the img-element to the image with the right value.
     */
    Dice.prototype.refreshDiceImage = function() {
      this.imgElement.setAttribute('src', 'images/' + this.value + '.png');
    };

    /**
     * Sets the dice to the initial status.
     */
    Dice.prototype.reset = function() {
      this.value = 0;
      this.hold = false;
    };

    // return the constructor - closure
    return Dice;
  })();

  /**
   * The main game object.
   * @memberOf derbo.games.webyatzy
   * @type {Object}
   * @name game
   */
  var game = {
    MAX_ROLLS: 3,
    numRolls: 0,
    numRounds: 1,
    rollButton: document.querySelector('#btnRoll'),
    dices: [
      // connected with the img tag in the yatzy.html
      new Dice(document.querySelector('#dice1')),
      new Dice(document.querySelector('#dice2')),
      new Dice(document.querySelector('#dice3')),
      new Dice(document.querySelector('#dice4')),
      new Dice(document.querySelector('#dice5'))
    ],
    fields: [
      new Field(document.querySelector('#acesField')),
      new Field(document.querySelector('#twosField')),
      new Field(document.querySelector('#threesField')),
      new Field(document.querySelector('#foursField')),
      new Field(document.querySelector('#fivesField')),
      new Field(document.querySelector('#sixesField')),
      new Field(document.querySelector('#three-of-a-kindField')),
      new Field(document.querySelector('#four-of-a-kindField')),
      new Field(document.querySelector('#full-houseField')),
      new Field(document.querySelector('#small-straightField')),
      new Field(document.querySelector('#large-straightField')),
      new Field(document.querySelector('#yatzyField')),
      new Field(document.querySelector('#chanceField'))
    ],
    sumFields: [
      new Field(document.querySelector('#sumAboveField')),
      new Field(document.querySelector('#bonusField')),
      new Field(document.querySelector('#sumBelowField')),
      new Field(document.querySelector('#sumField'))
    ],
    verifier: new DiceCombinationVerifier(),

    /**
     *
     */
    roll: function() {
      if ( this.numRolls < this.MAX_ROLLS ) {
        this.dices.forEach(function( dice, index, dices ) {
          dice.roll();
          dice.refreshDiceImage();
        });
        this.numRolls++;
        return this.numRolls;
      } else {
        return false;
      }
    },

    /**
     *
     */
    refresh: function() {
      // reset the sum first
      this.sumFields.forEach(function( field ) {
        field.value = 0;
      });
      this.sumFields[ 0 ].value = this.fields
          .filter(Field.prototype.filterAboveFields)
          .reduce(Field.prototype.reduceFieldsByPoints, 0);
      this.sumFields[ 2 ].value = this.fields
          .filter(Field.prototype.filterBelowFields)
          .reduce(Field.prototype.reduceFieldsByPoints, 0);

      // check bonus points
      this.sumFields[ 1 ].value = (this.sumFields[ 0 ].value >= 63) ? 35 : 0;
      // sum total points
      this.sumFields[ 3 ].value = this.sumFields[ 0 ].value + this.sumFields[ 1 ].value + this.sumFields[ 2 ].value;
      // refresh points in html
      this.sumFields.forEach(function( field ) {
        if ( field.value !== null ) {
          field.imgElement.lastElementChild.innerHTML = field.value;
        } else {
          field.imgElement.lastElementChild.innerHTML = '-';
        }
      });

      // todo debug
      document.querySelector('#info').innerHTML = 'Sum: ' + this.sumFields[ 3 ].value;
    },

    /**
     *
     */
    nextRound: function() {
      this.numRolls = 0;
      this.dices.forEach(function( dice ) {
        dice.reset();
        // if the dice was hold, remove the class
        if ( dice.imgElement.classList.contains('hold') ) {
          dice.imgElement.classList.remove('hold');
        }
        dice.refreshDiceImage();
      });
      this.rollButton.removeAttribute('disabled');
      this.refresh();
      this.numRounds++;

      if ( this.numRounds === 14 ) this.rollButton.setAttribute('disabled', 'disabled');
      //todo debug
      document.querySelector('#infoRounds').innerHTML = 'Round: ' + this.numRounds;
    }
  };


  /**
   * Represents a playable field.
   * @memberOf derbo.games.webyatzy
   * @param imgElement A div element with the two span elements
   * @constructor
   */
  function Field( imgElement ) {
    this.imgElement = imgElement;
    this.value = null; // stores the points
  }

  Field.prototype = {
    constructor: Field,
    /*
     Functions for .filter and .reduce:
     */
    /**
     *
     * @param field
     * @returns {boolean}
     */
    filterAboveFields: function( field ) {
      return field.imgElement.classList.contains('aboveField');
    },
    /**
     *
     * @param field
     * @returns {boolean}
     */
    filterBelowFields: function( field ) {
      return field.imgElement.classList.contains('belowField');
    },
    /**
     *
     * @param points
     * @param field
     * @returns {number}
     */
    reduceFieldsByPoints: function( points, field ) {
      return points += field.value;
    }
  };

  /**
   * New version of DiceCombinationVerifier() as singleton and without switch-case
   * Singleton object to verify dice combinations
   * @type {Object}
   * @name diceCombination
   * @memberOf derbo.games.webyatzy
   */
  var diceCombination = (function() {
    /** @private */
    var _dices = null,
        _sum = 0,
        isVerify,
        hasThree,
        hasTwo,
        verifyValue,
        verifyValues; // array with the number of each dice values

    var verify = {
      acesField: function() {
        verifyAboveField(1);
        return result();
      },
      twosField: function() {
        verifyAboveField(2);
        return result();
      },
      threesField: function() {
        verifyAboveField(3);
        return result();
      },
      foursField: function() {
        verifyAboveField(4);
        return result();
      },
      fivesField: function() {
        verifyAboveField(5);
        return result();
      },
      sixesField: function() {
        verifyAboveField(6);
        return result();
      }
    };

    /**
     * set() have to call before verify(): fluent api
     * @param dices
     * @returns {object} diceCombination
     */
    function set( dices ) {
      _dices = dices;
      _sum = 0;
      // return object for fluent api
      return diceCombination;
    }

    function result() {
      // before return the result, the _dices have to set to null: so for the next call of verify() the set()
      // have to call first
      _dices = null;
      return _sum;
    }

    function verifyable() {
      return _dices !== null;
    }

    /**
     *
     * @param verifyValue
     */
    function verifyAboveField( verifyValue ) {
      if ( verifyable() ) {
        _dices.forEach(function( dice ) {
          if ( dice.value === verifyValue ) {
            _sum += dice.value;
          }
        });
      }
    }

    // the public functions for diceCombination object
    return {
      verify: verify,
      set: set
    };
  })();

  console.log(diceCombination.set(game.dices).verify.acesField());

  /**
   * Checks the five dices to the right combination.
   * @constructor
   */
  function DiceCombinationVerifier() {
    var sum,
        isVerify,
        hasThree,
        hasTwo,
        verifyValue,
        verifyValues; // array with the number of each dice values
    this.verify = function( dices, fieldType ) {
      sum = 0;
      verifyValue = null;
      isVerify = false;
      hasThree = false;
      hasTwo = false;
      verifyValues = new Array(7);

      switch ( fieldType ) {
        case 'acesField':
          if ( verifyValue === null ) verifyValue = 1;
        case 'twosField':
          if ( verifyValue === null ) verifyValue = 2;
        case 'threesField':
          if ( verifyValue === null ) verifyValue = 3;
        case 'foursField':
          if ( verifyValue === null ) verifyValue = 4;
        case 'fivesField':
          if ( verifyValue === null ) verifyValue = 5;
        case 'sixesField':
          if ( verifyValue === null ) verifyValue = 6;
          dices.forEach(function( dice ) {
            if ( dice.value === verifyValue ) {
              sum += dice.value;
            }
          });
          break;
        case 'three-of-a-kindField':
          if ( verifyValue === null ) verifyValue = 3;
        case 'four-of-a-kindField':
          if ( verifyValue === null ) verifyValue = 4;
        case 'yatzyField':
          if ( verifyValue === null ) verifyValue = 5;
          fillVerifyValues(dices);
          verifyValues.forEach(function( value, index ) {
            sum += value * index;
            if ( value >= verifyValue ) isVerify = true;
          });
          if ( !isVerify ) sum = 0;
          if ( isVerify && verifyValue === 5 ) sum = 50;
          break;
        case 'full-houseField':
          fillVerifyValues(dices);
          verifyValues.forEach(function( value ) {
            if ( value === 3 ) hasThree = true;
            if ( value === 2 ) hasTwo = true;
          });
          if ( hasThree && hasTwo ) sum = 25;
          break;
        case 'small-straightField':
          fillVerifyValues(dices);
          if ( containsInVerifyValues([ 1, 2, 3, 4 ])
              || containsInVerifyValues([ 2, 3, 4, 5 ])
              || containsInVerifyValues([ 3, 4, 5, 6 ]) ) {
            sum = 30;
          }
          break;
        case 'large-straightField':
          fillVerifyValues(dices);
          if ( containsInVerifyValues([ 1, 2, 3, 4, 5 ])
              || containsInVerifyValues([ 2, 3, 4, 5, 6 ]) ) {
            sum = 40;
          }
          break;
        case 'chanceField':
          dices.forEach(function( dice ) {
            sum += dice.value;
          });
          break;
        default:
          return 0;
      }
      return sum;
    };

    var fillVerifyValues = function( dices ) {
      // reset
      for ( var i = 0; i < verifyValues.length; i++ ) {
        verifyValues[ i ] = 0;
      }
      dices.forEach(function( dice ) {
        verifyValues[ dice.value ] += 1;
      });
    };

    var containsInVerifyValues = function( values ) {
      var numVerified = 0;
      if ( Array.isArray(values) ) {
        values.forEach(function( val ) {
          if ( verifyValues[ val ] > 0 ) numVerified++;
        })
      }
      return numVerified === values.length;
    }
  }

  /*
   Event Listener:
   */
  game.rollButton.addEventListener('click', function() {
    if ( game.roll() == game.MAX_ROLLS ) {
      game.rollButton.setAttribute('disabled', 'disabled');
    }
  });

  game.dices.forEach(function( dice ) {
    dice.imgElement.addEventListener('click', function() {
      if ( game.numRolls > 0 ) {
        dice.switchHold();
        dice.imgElement.classList.toggle('hold');
      }
    })
  });

  game.fields.forEach(function( field ) {
    field.imgElement.addEventListener('mouseover', function() {
      if ( field.value === null && game.numRolls > 0 ) {
        field.imgElement.lastElementChild.innerHTML = diceCombination.set(game.dices).verify[ field.imgElement.id ]();
      }
    });
    field.imgElement.addEventListener('mouseout', function() {
      if ( field.value === null && game.numRolls > 0 ) {
        field.imgElement.lastElementChild.innerHTML = '-';
      }
    });
    field.imgElement.addEventListener('click', function() {
      if ( field.value === null && game.numRolls > 0 ) {
        var points = game.verifier.verify(game.dices, field.imgElement.id);
        if ( !points ) {
          var conf = confirm('Achtung: dies gibt 0 Punkte, sind Sie sicher?');
        }
        if ( conf || points ) {
          field.value = points;
          field.imgElement.lastElementChild.innerHTML = points;
          game.nextRound();
        }
      }
    })
  });
})();
