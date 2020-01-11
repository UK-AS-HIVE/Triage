import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Blaze } from "meteor/blaze";
import { Session } from "meteor/session";

import { Media } from 'meteor/hive:file-registry';

import _ from 'underscore';

import { Queues, Tickets, Tags } from "/lib/collections";
import { Parsers } from "/imports/util/parsers";


Template.newTicketModal.helpers({
  queues: function() {
    return Queues.find();
  },
  errorText: function() {
    return Template.instance().errorText.get();
  },
  submitting: function() {
    return Template.instance().submitting.get();
  },
  files: function() {
    var files;
    files = Template.instance().attachedFiles.get();
    if (files.length) {
      return FileRegistry.find({
        _id: {
          $in: files
        }
      });
    }
  }
});

Template.newTicketModal.events({
  'hidden.bs.modal': function(e, tpl) {
    tpl.$('input[name=tags]').select2('destroy');
    return Blaze.remove(tpl.view);
  },
  'click button[data-action=uploadFile]': function(e, tpl) {
    return Media.pickLocalFile(function(fileId) {
      var files;
      console.log("Uploaded a file, got _id: ", fileId);
      files = tpl.attachedFiles.get() || [];
      files.push(fileId);
      return tpl.attachedFiles.set(files);
    });
  },
  'click a[data-action=removeAttachment]': function(e, tpl) {
    var files, id;
    id = $(e.target).data('file');
    files = _.without(tpl.attachedFiles.get(), id);
    return tpl.attachedFiles.set(files);
  },
  'click button[data-action=submit]': function(e, tpl) {
    var body, hashtags, queueName, splitTags, submitter, tags, title, users;
    tpl.submitting.set(true);
    body = tpl.find('textarea[name=body]').value;
    title = tpl.find('input[name=title]').value;
    tags = tpl.find('input[name=tags]').value;
    splitTags = [];
    if (tags !== "") {
      splitTags = tags.split(',').map(function(x) {
        return x.replace('#', '');
      });
    }
    hashtags = Parsers.getTags(body);
    hashtags = _.uniq((hashtags != null ? hashtags.concat(Parsers.getTags(title)).concat(splitTags) : void 0) || []);
    users = Parsers.getUserIds(body);
    users = _.uniq(users != null ? users.concat(Parsers.getUserIds(title) || []) : void 0);
    submitter = tpl.$('input[name=onBehalfOf]').val() || Meteor.user().username;
    queueName = tpl.$('select[name=queue]').val();
    return Meteor.call('checkUsername', submitter, function(err, res) {
      if (res) {
        if (submitter !== Meteor.user().username) {
          setUsernameSuccess(tpl);
        }
        return Tickets.insert({
          title: title,
          body: body,
          tags: hashtags,
          associatedUserIds: users,
          queueName: queueName,
          authorId: res,
          authorName: submitter,
          status: 'Open',
          submittedTimestamp: new Date(),
          attachmentIds: tpl.attachedFiles.get(),
          submissionData: {
            method: "Web"
          }
        }, function(err, res) {
          var i, key, len, ref, results;
          if (err) {
            tpl.submitting.set(false);
            tpl.errorText.set("Error: " + err.message + ".");
            tpl.$('.has-error').removeClass('has-error');
            console.log(err);
            ref = err.invalidKeys;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              key = ref[i];
              results.push(tpl.$('[name=' + key.name + ']').closest('div .form-group').addClass('has-error'));
            }
            return results;
          } else {
            clearFields(tpl);
            return $('#newTicketModal').modal('hide');
          }
        });
      } else {
        tpl.submitting.set(false);
        return setUsernameFail(tpl);
      }
    });
  },
  'click button[data-action=checkUsername]': function(e, tpl) {
    return checkUsername(e, tpl, tpl.$('input[name="onBehalfOf"]').val());
  },
  'keyup input[name=onBehalfOf]': function(e, tpl) {
    if (e.which === 13) {
      return checkUsername(e, tpl, tpl.$('input[name="onBehalfOf"]').val());
    }
  },
  'autocompleteselect input[name=onBehalfOf]': function(e, tpl) {
    return setUsernameSuccess(tpl);
  },
  'show.bs.modal #newTicketModal': function(e, tpl) {
    var tags;
    tpl.$('select[name=queue]').val(Session.get('queueName'));
    tags = _.pluck(Tags.find().fetch(), 'name');
    return tpl.$('input[name=tags]').select2({
      tags: tags,
      tokenSeparators: [' ', ',']
    });
  },
  'click button[data-dismiss="modal"]': function(e, tpl) {
    return clearFields(tpl);
  }
});

Template.newTicketModal.onCreated(function() {
  this.attachedFiles = new ReactiveVar([]);
  this.errorText = new ReactiveVar();
  return this.submitting = new ReactiveVar(false);
});

Template.newTicketModal.rendered = function() {
  var tags, tpl;
  tpl = this;
  this.autorun(function() {
    if (tpl.attachedFiles.get().length) {
      return Meteor.subscribe('unattachedFiles', tpl.attachedFiles.get());
    }
  });
  tags = _.pluck(Tags.find().fetch(), 'name');
  return $('input[name=tags]').select2({
    tags: tags,
    tokenSeparators: [' ', ',']
  });
};

function clearFields(tpl) {
  tpl.submitting.set(false);
  tpl.errorText.set(null);
  tpl.attachedFiles.set([]);
  tpl.$('input, textarea').val('');
  tpl.$('.has-error').removeClass('has-error');
  tpl.$('.has-success').removeClass('has-success');
  tpl.$('button[data-action=checkUsername]').removeClass('btn-success').removeClass('btn-danger').addClass('btn-primary').html('Check');
  return tpl.$('select[name=queue]').select2('val', '');
};

function checkUsername(e, tpl, val) {
  if (!(val.length < 1)) {
    return Meteor.call('checkUsername', val, function(err, res) {
      if (res) {
        return setUsernameSuccess(tpl);
      } else {
        return setUsernameFail(tpl);
      }
    });
  }
};

function setUsernameSuccess(tpl) {
  tpl.$('input[name=onBehalfOf]').closest('div .form-group').removeClass('has-error').addClass('has-success');
  tpl.$('button[data-action=checkUsername]').html('<span class="glyphicon glyphicon-ok"></span>');
  return tpl.$('button[data-action=checkUsername]').removeClass('btn-danger').removeClass('btn-primary').addClass('btn-success');
};

function setUsernameFail(tpl) {
  tpl.$('input[name=onBehalfOf]').closest('div .form-group').removeClass('has-success').addClass('has-error');
  tpl.$('button[data-action=checkUsername]').removeClass('btn-success').removeClass('btn-primary').addClass('btn-danger');
  return tpl.$('button[data-action=checkUsername]').html('<span class="glyphicon glyphicon-remove"></span>');
};
