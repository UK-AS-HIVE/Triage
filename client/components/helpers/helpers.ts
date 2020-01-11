import {Meteor} from 'meteor/meteor'; 
import {Template} from 'meteor/templating';
import { Tags, Statuses } from '/lib/collections';

import { escapeString } from '/imports/util/escapeString';

Template.registerHelper('usernameFromId', function(userId) {
  var ref;
  return (ref = Meteor.users.findOne(userId)) != null ? ref.username : void 0;
});

Template.registerHelper('isCordova', function() {
  return Meteor.isCordova;
});

Template.registerHelper('arrayify', function(obj) {
  var k, result, v;
  result = [];
  for (k in obj) {
    v = obj[k];
    result.push({
      name: k,
      value: v
    });
  }
  return result;
});

Template.registerHelper('linkify', function(text) {
  var emailAddressPattern, pseudoUrlPattern, replacedText, urlPattern;
  text = escapeString(text);
  urlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
  pseudoUrlPattern = /(^|[^\/])(www\.[-A-Z0-9+&@#\/%=~_|.]*[-A-Z0-9+&@#\/%=~_|])/gim;
  emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;
  replacedText = text.replace(urlPattern, '<a href="$&" target="_blank">$&</a>').replace(pseudoUrlPattern, '$1<a href="http://$2" target="_blank">$2</a>').replace(emailAddressPattern, '<a href="mailto:$&">$&</a>');
  return Spacebars.SafeString(replacedText);
});

Template.registerHelper('tokenSettings', function() {
  return {
    position: "bottom",
    limit: 5,
    rules: [
      {
        token: '@',
        collection: Meteor.users,
        field: 'username',
        template: Template.userPill,
        selector: function(match) {
          var r;
          r = new RegExp(match, 'i');
          return {
            $or: [
              {
                username: r
              }, {
                displayName: r
              }
            ]
          };
        }
      }, {
        token: '#',
        collection: Tags,
        field: 'name',
        template: Template.tagPill,
        noMatchTemplate: Template.noMatchTagPill
      }, {
        token: 'status:',
        collection: Statuses,
        field: 'name',
        template: Template.statusPill,
        noMatchTemplate: Template.noMatchStatusPill
      }
    ]
  };
});

Template.registerHelper('userSettings', function() {
  return {
    position: "top",
    limit: 5,
    rules: [
      {
        collection: Meteor.users,
        field: 'username',
        template: Template.userPill,
        noMatchTemplate: Template.noMatchUserPill,
        selector: function(match) {
          var r;
          r = new RegExp(match, 'i');
          return {
            $or: [
              {
                username: r
              }, {
                displayName: r
              }
            ]
          };
        }
      }
    ]
  };
});

Template.registerHelper('userSettingsBottom', function() {
  return {
    position: "bottom",
    limit: 5,
    rules: [
      {
        collection: Meteor.users,
        field: 'username',
        template: Template.userPill,
        noMatchTemplate: Template.noMatchUserPill,
        selector: function(match) {
          var r;
          r = new RegExp(match, 'i');
          return {
            $or: [
              {
                username: r
              }, {
                displayName: r
              }
            ]
          };
        }
      }
    ]
  };
});

Template.registerHelper('tagSettings', function() {
  return {
    position: "top",
    limit: 5,
    rules: [
      {
        collection: Tags,
        field: 'name',
        template: Template.tagPill,
        noMatchTemplate: Template.noMatchTagPill
      }
    ]
  };
});


