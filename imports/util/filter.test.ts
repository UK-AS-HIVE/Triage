import { Meteor } from "meteor/meteor";
import { it, describe } from "meteor/practicalmeteor:mocha";
import { expect } from "chai";

import { Filter } from "./filter";

const filter = {
  queueName: 'Q',
  search: 'phrase',
  status: '!Closed'
};

const filter2 = {
  queueName: 'Q',
  userId: 1,
  status: "Open"
};

const filter3 = {
  queueName: ['Q', 'R'],
  status: '!Closed'
};

const filter4 = {
  queueName: 'Q',
  search: '1234',
  status: '!Closed'
};

describe('Filter', function() {
  describe('toMongoSelector', function() {
    const selector = Filter.toMongoSelector(filter);
    if (Meteor.isServer) {
      it('includes {$text} for full-text search on the server', function() {
        expect(selector).to.deep.equal({
          queueName: 'Q',
          $text: {
            '$search': 'phrase'
          },
          status: {
            '$ne': 'Closed'
          }
        });
      });
      it('should search by ticket number, if query is a number', function() {
        expect(Filter.toMongoSelector(filter4)).to.deep.equal({
          queueName: 'Q',
          status: {
            '$ne': 'Closed'
          },
          $or: [
            {
              $text: {
                '$search': '1234'
              }
            }, {
              ticketNumber: 1234
            }
          ]
        });
      });
    }
    if (Meteor.isClient) {
      it('filters to queueName and a default closed status on client', function() {
        expect(selector).to.deep.equal({
          queueName: 'Q',
          status: {
            '$ne': 'Closed'
          }
        });
      });
    }
  });
  return it('verifyFilterObject', function() {
    expect(Filter.verifyFilterObject(filter, ['Q', 'C', 'D'], 1)).to.be["true"];
    expect(Filter.verifyFilterObject(filter, ['C', 'D'])).to.be["false"];
    expect(Filter.verifyFilterObject(filter2, ['Q', 'C', 'D'], 1)).to.be["true"];
    expect(Filter.verifyFilterObject(filter2, ['C', 'D'], 1)).to.be["true"];
    expect(Filter.verifyFilterObject(filter2, ['Q', 'C', 'D'], 2)).to.be["false"];
    expect(Filter.verifyFilterObject(filter3, ['Q', 'R', 'C'])).to.be["true"];
    return expect(Filter.verifyFilterObject(filter3, ['Q', 'C', 'D'])).to.be["false"];
  });
});

