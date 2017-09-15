/* eslint-env node, mocha */

const whitelister = require('../lib/whitelister');
const { ArgumentError, WhitelistError } = require('../lib/errors');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chaiAsPromised.transferPromiseness = function transferPromiseness(assertion, promise) {
  assertion.then = promise.then.bind(promise);
  assertion.catch = promise.catch.bind(promise);
};

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Whitelister (asynchronous)', () => {
  it('should be a function', (done) => {
    expect(whitelister).to.be.a('function');
    done();
  });

  describe('basic errors', () => {
    it('should require rules as an argument', (done) => {
      expect(whitelister())
        .to.eventually.be.rejectedWith(ArgumentError, 'rules is not an object or string')
        .and.notify(done);
    });

    it('should require rules (an object or string) as first argument', (done) => {
      expect(whitelister(true))
        .to.eventually.be.rejectedWith(ArgumentError, 'rules is not an object or string')
        .and.notify(done);
    });
  });

  describe('basic usage', () => {
    it('should return an empty object when rules are empty', (done) => {
      const rules = {};
      const params = {};
      expect(whitelister(rules, params)).to.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object');
          expect(Object.keys(response)).to.have.lengthOf(0);
          done();
        });
    });

    it('should return an empty object when params are empty', (done) => {
      const rules = {
        name: 'string',
      };
      const params = {};
      expect(whitelister(rules, params)).to.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object');
          expect(Object.keys(response)).to.have.lengthOf(0);
          done();
        });
    });

    it('should return an empty object when params have non-whitelisted props', (done) => {
      const rules = {
        name: 'string',
      };
      const params = {
        email: 'bob@email.com',
      };

      expect(whitelister(rules, params)).to.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object');
          expect(Object.keys(response)).to.have.lengthOf(0);
          done();
        });
    });

    it('should return an object with "name" prop', (done) => {
      const rules = {
        name: 'string',
      };
      const params = {
        email: 'bob@email.com',
        name: 'Bob Smith',
      };
      expect(whitelister(rules, params)).to.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object');
          expect(response).to.have.property('name', 'Bob Smith');
          done();
        });
    });

    it('should throw when missing required prop', (done) => {
      const rules = {
        name: 'string',
        id: { type: 'integer', required: true },
      };
      const params = {
        email: 'bob@email.com',
        name: 'Bob Smith',
      };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'id');
          expect(response.errors[0]).to.have.property('message', 'is required');

          done();
        });
    });
  });

  describe('type: null', () => {
    it('should require a key with a null value', (done) => {
      const rules = {
        user: {
          type: 'object',
          required: true,
          attributes: {
            secret_password: { type: 'null', required: true },
          },
        },
      };
      const params = { user: { secret_password: 'P@ssw0rd' } };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'user[secret_password]');
          expect(response.errors[0]).to.have.property('message', 'must be null');

          done();
        });
    });

    it('should return an object where user.secret_password is null', (done) => {
      const rules = {
        user: {
          type: 'object',
          required: true,
          attributes: {
            secret_password: { type: 'null', required: true },
          },
        },
      };
      const params = { user: { secret_password: null } };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object')
            .that.has.property('user')
            .that.has.property('secret_password', null);
          done();
        });
    });
  });

  describe('type: integer', () => {
    it('should throw an error if value is "hello"', (done) => {
      const rules = { user_id: { type: 'integer' } };
      const params = { user_id: 'hello' };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'user_id');
          expect(response.errors[0]).to.have.property('message', 'is not an integer');

          done();
        });
    });

    it('should parse "100" to integer', (done) => {
      const rules = { user_id: { type: 'integer' } };
      const params = { user_id: '100' };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object').that.has.property('user_id', 100);
          done();
        });
    });

    it('should accept 9999', (done) => {
      const rules = { user_id: { type: 'integer' } };
      const params = { user_id: 9999 };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object').that.has.property('user_id', 9999);
          done();
        });
    });

    it('should throw an error if value is above 10', (done) => {
      const rules = { user_id: { type: 'integer', max: 10 } };
      const params = { user_id: 11 };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'user_id');
          expect(response.errors[0]).to.have.property('message', 'is too large (max 10)');

          done();
        });
    });

    it('should throw an error if value is below 10', (done) => {
      const rules = { user_id: { type: 'integer', min: 10 } };
      const params = { user_id: 9 };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'user_id');
          expect(response.errors[0]).to.have.property('message', 'is too small (min 10)');

          done();
        });
    });
  });

  describe('type: float', () => {
    it('should throw an error if value is "hello"', (done) => {
      const rules = { amount: { type: 'float' } };
      const params = { amount: 'hello' };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'amount');
          expect(response.errors[0]).to.have.property('message', 'is not a float');

          done();
        });
    });

    it('should parse "99.9" to float', (done) => {
      const rules = { amount: { type: 'float' } };
      const params = { amount: '99.9' };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object').that.has.property('amount', 99.9);
          done();
        });
    });

    it('should accept 88.8', (done) => {
      const rules = { amount: { type: 'float' } };
      const params = { amount: 88.8 };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object').that.has.property('amount', 88.8);
          done();
        });
    });

    it('should throw an error if value is above 44.4', (done) => {
      const rules = { amount: { type: 'float', max: 44.4 } };
      const params = { amount: 44.6 };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'amount');
          expect(response.errors[0]).to.have.property('message', 'is too large (max 44.4)');

          done();
        });
    });

    it('should throw an error if value is below 44.4', (done) => {
      const rules = { amount: { type: 'float', min: 44.4 } };
      const params = { amount: 44.2 };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'amount');
          expect(response.errors[0]).to.have.property('message', 'is too small (min 44.4)');

          done();
        });
    });
  });

  describe('type: boolean', () => {
    it('should throw an error if value is a non-bool string "hello"', (done) => {
      const rules = { accept: { type: 'boolean' } };
      const params = { accept: 'hello' };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'accept');
          expect(response.errors[0]).to.have.property('message', 'is not true or false');

          done();
        });
    });

    it('should accept truthy values of 1, true, "TRUE", "1", and "t"', (done) => {
      const rules = {
        is_ok: 'boolean',
        is_fine: 'boolean',
        is_nice: 'boolean',
        is_alright: 'boolean',
        is_meh: 'boolean',
      };
      const params = {
        is_ok: 1,
        is_fine: true,
        is_nice: 'TRUE',
        is_alright: '1',
        is_meh: 't',
      };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object');
          expect(response).to.have.property('is_ok', true);
          expect(response).to.have.property('is_fine', true);
          expect(response).to.have.property('is_nice', true);
          expect(response).to.have.property('is_alright', true);
          expect(response).to.have.property('is_meh', true);
          done();
        });
    });

    it('should accept falsey values of 0, false, "false", "0", and "F"', (done) => {
      const rules = {
        is_ok: 'boolean',
        is_fine: 'boolean',
        is_nice: 'boolean',
        is_alright: 'boolean',
        is_meh: 'boolean',
      };
      const params = {
        is_ok: 0,
        is_fine: false,
        is_nice: 'false',
        is_alright: '0',
        is_meh: 'F',
      };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object');
          expect(response).to.have.property('is_ok', false);
          expect(response).to.have.property('is_fine', false);
          expect(response).to.have.property('is_nice', false);
          expect(response).to.have.property('is_alright', false);
          expect(response).to.have.property('is_meh', false);
          done();
        });
    });
  });

  describe('type: string', () => {
    it('should throw an error if value is an object', (done) => {
      const rules = { message: 'string' };
      const params = { message: { text: 'howdy' } };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'message');
          expect(response.errors[0]).to.have.property('message', 'is not a string');

          done();
        });
    });

    it('should accept value of "hello world"', (done) => {
      const rules = { message: 'string' };
      const params = { message: 'hello world' };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.have.property('message', 'hello world');
          done();
        });
    });
  });

  describe('type: email', () => {
    it('should throw an error if value is an object', (done) => {
      const rules = { email: 'email' };
      const params = { email: { text: 'howdy@thing.com' } };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'email');
          expect(response.errors[0]).to.have.property('message', 'is not a valid email address');

          done();
        });
    });

    it('should throw an error if domain is omitted', (done) => {
      const rules = { email: 'email' };
      const params = { email: 'bob@email' };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'email');
          expect(response.errors[0]).to.have.property('message', 'is not a valid email address');

          done();
        });
    });

    it('should throw an error if prefix is omitted', (done) => {
      const rules = { email: 'email' };
      const params = { email: '@email.com' };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'email');
          expect(response.errors[0]).to.have.property('message', 'is not a valid email address');

          done();
        });
    });

    it('should accept value of "bob@email.com"', (done) => {
      const rules = { email: 'email' };
      const params = { email: 'bob@email.com' };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.have.property('email', 'bob@email.com');
          done();
        });
    });

    it('should accept value of "bob+spam@email.com"', (done) => {
      const rules = { email: 'email' };
      const params = { email: 'bob+spam@email.com' };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.have.property('email', 'bob+spam@email.com');
          done();
        });
    });
  });

  describe('type: array', () => {
    it('should throw an error if value is an object', (done) => {
      const rules = { digits: 'array' };
      const params = { digits: { numbers: [1, 2, 3] } };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'digits');
          expect(response.errors[0]).to.have.property('message', 'is not an array');

          done();
        });
    });

    it('should throw an error if min length is not met', (done) => {
      const rules = {
        digits: { type: 'array', minLength: 7 },
      };
      const params = { digits: [1, 2, 3, 4, 5, 6] };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'digits');
          expect(response.errors[0]).to.have.property('message', 'has too few elements (min 7 elements)');

          done();
        });
    });

    it('should throw an error if max length is exceeded', (done) => {
      const rules = {
        digits: { type: 'array', maxLength: 7 },
      };
      const params = { digits: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'digits');
          expect(response.errors[0]).to.have.property('message', 'has too many elements (max 7 elements)');

          done();
        });
    });

    it('should accept a valid array of numbers', (done) => {
      const rules = { digits: 'array' };
      const params = { digits: [1, 2, 3] };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object')
            .that.has.property('digits')
            .that.is.an('array')
            .that.has.members([1, 2, 3]);
          done();
        });
    });

    // TODO: be able to validate what is inside the array when its not objects
    it('should accept a valid array of numbers with attributes', (done) => {
      const rules = {
        digits: {
          type: 'array',
          attributes: {
            type: 'integer',
          },
        },
      };
      const params = { digits: [1, 2, 3] };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object')
            .that.has.property('digits')
            .that.is.an('array')
            .that.has.members([1, 2, 3]);
          done();
        });
    });
  });

  describe('type: object', () => {
    it('should throw an error if value is a string "hello world"', (done) => {
      const rules = {
        user: {
          type: 'object',
        },
      };
      const params = { user: 'hello world' };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'user');
          expect(response.errors[0]).to.have.property('message', 'is not an object');

          done();
        });
    });

    it('should accept a valid object', (done) => {
      const rules = {
        user: {
          type: 'object',
          attributes: {
            id: 'integer',
          },
        },
      };
      const params = { user: { id: 1 } };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object').that.has.property('user').that.has.property('id', 1);
          done();
        });
    });

    it('should throw an error if at least one of required keys is not present', (done) => {
      const rules = {
        user: {
          type: 'object',
          requireOneOf: ['username', 'name'],
          attributes: {
            username: 'string',
            name: 'string',
          },
        },
      };
      const params = { user: { id: 1 } };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'user');
          expect(response.errors[0]).to.have.property('message', 'must include one of username, name');

          done();
        });
    });

    it('should accept a valid object where one of required keys is present', (done) => {
      const rules = {
        user: {
          type: 'object',
          requireOneOf: ['username', 'name'],
          attributes: {
            username: 'string',
            name: 'string',
          },
        },
      };
      const params = { user: { id: 1, name: 'Bob' } };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object').that.has.property('user').that.has.property('name', 'Bob');
          done();
        });
    });
  });

  describe('rule: allowNull', () => {
    const rules = { name: { type: 'string', allowNull: true } };
    it('should return an object with property: null', (done) => {
      expect(whitelister(rules, { name: null })).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object').that.has.property('name', null);
          done();
        });
    });
  });

  describe('rule: default', () => {
    it('should return an object with a default value', (done) => {
      const rules = { per_page: { type: 'integer', default: 20 } };
      expect(whitelister(rules, {})).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.be.an('object').that.has.property('per_page', 20);
          done();
        });
    });
  });

  describe('custom filters', () => {
    it('should throw an error for a short hand custom filter', (done) => {
      const rules = {
        user: {
          type: 'object',
          attributes: {
            id: val => val !== 100,
          },
        },
      };
      const params = { user: { id: 100 } };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'user[id]');
          expect(response.errors[0]).to.have.property('message', 'is invalid');

          done();
        });
    });

    it('should throw an error for a long form custom filter', (done) => {
      const rules = {
        user: {
          type: 'object',
          attributes: {
            id: {
              type: 'integer',
              filterWith: val => val !== 100,
            },
          },
        },
      };
      const params = { user: { id: 100 } };
      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'user[id]');
          expect(response.errors[0]).to.have.property('message', 'is invalid');

          done();
        });
    });

    it('should successfully use a short hand custom filter', (done) => {
      const rules = {
        user: {
          type: 'object',
          attributes: {
            id: val => val === 100,
          },
        },
      };
      const params = { user: { id: 100 } };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.have.property('user').that.has.property('id', 100);
          done();
        });
    });

    it('accept and use a long form custom filter', (done) => {
      const rules = {
        user: {
          type: 'object',
          attributes: {
            id: {
              type: 'integer',
              filterWith: val => val === 100,
            },
          },
        },
      };
      const params = { user: { id: 100 } };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.have.property('user').that.has.property('id', 100);
          done();
        });
    });
  });

  describe('Value transformations', () => {
    it('should return value / 2', (done) => {
      const rules = {
        user_id: {
          type: 'integer',
          postTransform: val => (val / 2),
        },
      };
      const params = { user_id: 100 };
      expect(whitelister(rules, params)).to.eventually.be.fulfilled
        .then((response) => {
          expect(response).to.have.property('user_id', 50);
          done();
        });
    });
  });

  describe('config: { nestedNames: false }', () => {
    it('should not nest user.id', (done) => {
      const rules = {
        user: {
          type: 'object',
          attributes: {
            id: 'integer',
          },
        },
      };
      const params = { user: { id: 'hello' } };
      whitelister.setConfig({ nestedNames: false });

      expect(whitelister(rules, params)).to.eventually.be.rejectedWith(WhitelistError)
        .then((response) => {
          expect(response).to.be.an.instanceof(WhitelistError)
            .that.has.property('errors')
            .that.is.an('array')
            .that.has.lengthOf(1);

          expect(response.errors[0]).to.have.property('field', 'id');
          expect(response.errors[0]).to.have.property('message', 'is not an integer');

          done();
        });
    });
  });
});
