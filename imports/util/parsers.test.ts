import {Meteor} from 'meteor/meteor';

import {describe, it} from 'meteor/practicalmeteor:mocha';
import {expect} from 'chai';

import {Parsers} from './parsers';

const test1 = 'hello @mdpadd2 this is a test #search status:"kljasd"';
const test2 = "@vrang2";

const tagsTest1 = "#tag/with/slash #tag-with-hyphen #tag_with_underscore";
const tagsTest2 = "#fff #000 #abc #f1f1f1 #f1f1 #f1f1f1wordafter";
const tagsTest3 = "waggle# waggle#test #test";

const content1 = "This is now done.\nThanks,\nPerson";
const result1 = "<p>This is now done.</p><p>Thanks,</p><p>Person</p>";

const content2 = "There are < 2 reasons to use < in place of 'less than' in a sentence.\nBut I did it anyway, because this is a test.";
const result2 = "<p>There are &lt; 2 reasons to use &lt; in place of &#x27;less than&#x27; in a sentence.</p>" + "<p>But I did it anyway, because this is a test.</p>";

if (Meteor.isClient) {
  describe('Parsers', function() {
    it('usernames and statuses', function() {
      expect(Parsers.getTerms(test1)).to.deep.equal(['hello', 'this', 'is', 'a', 'test']);
      expect(Parsers.getUsernames(test1)).to.deep.equal(['mdpadd2']);
      expect(Parsers.getStatuses(test1)).to.deep.equal(['kljasd']);
      expect(Parsers.getTerms(test2)).to.deep.equal([]);
      return expect(Parsers.getUsernames(test2)).to.deep.equal(['vrang2']);
    });
    return it('hashtags and hex codes', function() {
      expect(Parsers.getTags(tagsTest1)).to.deep.equal(['tag/with/slash', 'tag-with-hyphen', 'tag_with_underscore']);
      expect(Parsers.getTags(tagsTest2)).to.deep.equal(['f1f1', 'f1f1f1wordafter']);
      return expect(Parsers.getTags(tagsTest3)).to.deep.equal(['test']);
    });
  });
}

if (Meteor.isServer) {
  describe('Parsers', function() {
    return it('email content parsing on server', function() {
      expect(Parsers.prepareContentForEmail(content1)).to.equal(result1);
      return expect(Parsers.prepareContentForEmail(content2)).to.equal(result2);
    });
  });
}

describe('Parsers', function() {
  return it('should not match numeric hashtags', function() {
    expect(Parsers.getTags("#string #1234")).to.deep.equal(['string']);
    return expect(Parsers.getTags("#alpha #5678 #beta")).to.deep.equal(['alpha', 'beta']);
  });
});

