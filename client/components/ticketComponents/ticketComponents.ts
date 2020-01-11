import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Blaze } from "meteor/blaze";
import { FileRegistry } from "meteor/hive:file-registry";

import { Changelog, Queues, Tickets, Statuses } from "/lib/collections";
import { Parsers } from "/imports/util/parsers";

Template.ticketNoteArea.helpers({
  changelog: function() {
    var items;
    items = Changelog.find({
      ticketId: this._id
    }, {
      sort: {
        timestamp: 1
      }
    });
    return {
      items: items,
      count: items.count()
    };
  },
  queueMember: function() {
    var ref;
    return _.contains((ref = Queues.findOne({
      name: this.queueName
    })) != null ? ref.memberIds : void 0, Meteor.userId());
  }
});

Template.ticketChangelogItem.helpers({
  internalNoteClass: function() {
    if (this.internal) {
      return 'internal-note';
    }
  },
  changeIsType: function(type) {
    return this.type === type;
  },
  fieldIs: function(field) {
    return this.field === field;
  },
  note: function() {
    if (this.type === "note") {
      return true;
    } else {
      return false;
    }
  },
  file: function() {
    return FileRegistry.findOne({
      _id: this.valueOf()
    });
  },
  noteParagraph: function() {
    return this.message.split('\n');
  }
});

Template.ticketChangelogItem.events({
  'click a[data-action=showAttachmentModal]': function(e, tpl) {
    return Iron.query.set('attachmentId', this.valueOf());
  }
});

Template.ticketInfoPanels.onCreated(function() {
  return this.associateUserError = new ReactiveVar("");
});

Template.ticketInfoPanels.onRendered(function() {
  var data, doc;
  doc = this.find('div[name=attachments]');
  doc.ondragover = function(e) {
    this.className = 'hover';
    e.preventDefault();
    return false;
  };
  doc.ondragend = function(e) {
    this.className = '';
    e.preventDefault();
    return false;
  };
  data = this.data;
  return doc.ondrop = function(e) {
    var entry, i, item, len, ref, traverse;
    e.preventDefault();
    ref = e.dataTransfer.items;
    for (i = 0, len = ref.length; i < len; i++) {
      item = ref[i];
      entry = item.webkitGetAsEntry();
      traverse = function(item, path) {
        path = path || '';
        if (item.isFile) {
          return item.file(function(file) {
            return FileRegistry.upload(file, function(fileId) {
              Tickets.update(data._id, {
                $addToSet: {
                  attachmentIds: fileId
                }
              });
              return Meteor.call('setFlag', Meteor.userId(), data._id, 'attachment', true);
            });
          });
        } else if (item.isDirectory) {
          return item.createReader().readEntries(function(entries) {
            var j, len1, results;
            results = [];
            for (j = 0, len1 = entries.length; j < len1; j++) {
              entry = entries[j];
              results.push(traverse(entry, path + item.name + '/'));
            }
            return results;
          });
        }
      };
      traverse(entry, '');
    }
    return false;
  };
});

Template.ticketInfoPanels.helpers({
  queueMember: function() {
    var ref;
    return _.contains((ref = Queues.findOne({
      name: this.queueName
    })) != null ? ref.memberIds : void 0, Meteor.userId());
  },
  file: function() {
    return FileRegistry.findOne({
      _id: this.valueOf()
    });
  },
  associateUserError: function() {
    return Template.instance().associateUserError.get();
  }
});

Template.removeAttachmentModal.helpers({
  attachment: function() {
    return FileRegistry.findOne(this.attachmentId);
  },
  ticket: function() {
    return Tickets.findOne(this.ticketId);
  }
});

Template.removeAttachmentModal.events({
  'click button[data-action=removeAttachment]': function(e, tpl) {
    Tickets.update(this.ticketId, {
      $pull: {
        attachmentIds: this.attachmentId
      }
    });
    return $('#removeAttachmentModal').modal('hide');
  },
  'show.bs.modal': function(e, tpl) {
    var zIndex;
    zIndex = 1040 + (10 * $('.modal:visible').length);
    $(e.target).css('z-index', zIndex);
    return setTimeout(function() {
      return $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
    }, 0);
  },
  'hidden.bs.modal': function(e, tpl) {
    Blaze.remove(tpl.view);
    if ($('.modal:visible').length) {
      return $('body').addClass('modal-open');
    }
  }
});

Template.ticketInfoPanels.events({
  'click a[data-action=showAttachmentModal]': function(e, tpl) {
    return Iron.query.set('attachmentId', this.valueOf());
  },
  'click a[data-action=removeAttachment]': function(e, tpl) {
    var data;
    data = {
      attachmentId: this.valueOf(),
      ticketId: tpl.data._id
    };
    Blaze.renderWithData(Template['removeAttachmentModal'], data, $('body').get(0));
    return $('#removeAttachmentModal').modal('show');
  },
  'keyup input[name=addTag]': function(e, tpl) {
    var ref, val;
    if (e.which === 13) {
      val = (ref = $(e.target).val()) != null ? ref.split(' ') : void 0;
      val = _.filter(val, function(x) {
        return x.length > 0;
      });
      Tickets.update(tpl.data._id, {
        $addToSet: {
          tags: {
            $each: val
          }
        }
      });
      return $(e.target).val('');
    }
  },
  'autocompleteselect input[name=addTag]': function(e, tpl, doc) {
    Tickets.update(tpl.data._id, {
      $addToSet: {
        tags: doc.name
      }
    });
    return $(e.target).val('');
  },
  'keyup input[name=associateUser]': function(e, tpl) {
    var id;
    if (e.which === 13 && $(e.target).val().length) {
      return id = Meteor.call('checkUsername', $(e.target).val(), function(err, res) {
        if (res) {
          associateUser(tpl, res);
          return $(e.target).val('');
        } else {
          tpl.associateUserError.set('User not found.');
          return setTimeout(function() {
            return tpl.associateUserError.set(null);
          }, 3000);
        }
      });
    }
  },
  'autocompleteselect input[name=associateUser]': function(e, tpl, doc) {
    associateUser(tpl, doc._id);
    return $(e.target).val('');
  },

  /* Uploading files. */
  'click a[data-action=uploadFile]': function(e, tpl) {
    return Media.pickLocalFile(function(fileId) {
      console.log("Uploaded a file, got _id: ", fileId);
      Tickets.update(tpl.data._id, {
        $addToSet: {
          attachmentIds: fileId
        }
      });
      return Meteor.call('setFlag', Meteor.userId(), tpl.data._id, 'attachment', true);
    });
  },
  'click a[data-action=takePicture]': function(e, tpl) {
    return Media.capturePhoto(function(fileId) {
      console.log("Uploaded a file, got _id: ", fileId);
      Tickets.update(tpl.data._id, {
        $addToSet: {
          attachmentIds: fileId
        }
      });
      return Meteor.call('setFlag', Meteor.userId(), tpl.data._id, 'attachment', true);
    });
  }
});

function associateUser(tpl, associatedUserId) {
  var associatedQueueMember, queueMember;
  queueMember = Queues.findOne({
    name: tpl.data.queueName,
    memberIds: Meteor.userId()
  });
  associatedQueueMember = Queues.findOne({
    name: tpl.data.queueName,
    memberIds: associatedUserId
  });
  if (queueMember || !associatedQueueMember) {
    return Tickets.update(tpl.data._id, {
      $addToSet: {
        associatedUserIds: associatedUserId
      }
    });
  } else {
    tpl.associateUserError.set('You do not have permission to associate this user.');
    return setTimeout(function() {
      return tpl.associateUserError.set(null);
    }, 3000);
  }
};

Template.ticketNoteInput.helpers({
  allowStatusChange: function() {
    var max, ref, ref1, sinceClose;
    if (Tickets.findOne(this.ticketId).status !== "Closed") {
      return true;
    } else {
      sinceClose = (Date.now() - Tickets.findOne(this.ticketId).closedTimestamp) / 1000;
      max = (ref = Meteor.settings) != null ? (ref1 = ref["public"]) != null ? ref1.reopenAllowedTimespan : void 0 : void 0;
      return sinceClose < max;
    }
  },
  closed: function() {
    return Tickets.findOne(this.ticketId).status === "Closed";
  },
  beta: function() {
    return Meteor.settings["public"].beta;
  },
  status: function() {
    return Tickets.findOne(this.ticketId).status;
  },
  statusSettings: function() {
    return {
      position: "bottom",
      limit: 5,
      rules: [
        {
          collection: Statuses,
          field: 'name',
          template: Template.statusPill,
          noMatchTemplate: Template.noMatchStatusPill
        }
      ]
    };
  }
});

Template.ticketNoteInput.events({
  'click button[name=addNote]': function(e, tpl) {
    return addNote(e, tpl, false, false);
  },
  'click button[name=addNoteAdmin]': function(e, tpl) {
    return addNote(e, tpl, true, false);
  },
  'click button[name=addInternalNote]': function(e, tpl) {
    return addNote(e, tpl, true, true);
  },
  'click button[name=addNoteAndReOpen]': function(e, tpl) {
    if (tpl.$('textarea[name=newNote]').val().trim().length > 0) {
      addNote(e, tpl, true, false);
    }
    return Tickets.update(tpl.data.ticketId, {
      $set: {
        status: 'Open'
      }
    });
  },
  'click button[name=addNoteAndClose]': function(e, tpl) {
    if (tpl.$('textarea[name=newNote]').val().trim().length > 0) {
      addNote(e, tpl, true, false);
    }
    return Tickets.update(tpl.data.ticketId, {
      $set: {
        status: 'Closed'
      }
    });
  },
  'click button[name=closeSilently]': function(e, tpl) {
    return Meteor.call('closeSilently', tpl.data.ticketId);
  },
  'input textarea[name=newNote]': function(e, tpl) {
    if ($(e.target).val() === "") {
      tpl.$('button[name=addNoteAndReOpen]').text("Re-Open Ticket");
      return tpl.$('button[name=addNoteAndClose]').text("Close Ticket");
    } else {
      tpl.$('button[name=addNoteAndReOpen]').text('Add Note and Re-Open');
      return tpl.$('button[name=addNoteAndClose]').text('Add Note and Close');
    }
  },
  'click .dropdown-menu[name=statusMenu]': function(e, tpl) {
    return e.stopPropagation();
  },
  'click .dropdown-menu[name=statusMenu] a': function(e, tpl) {
    var ticket;
    ticket = Tickets.findOne(this.ticketId);
    if (ticket.status !== $(e.target).html()) {
      Tickets.update(this.ticketId, {
        $set: {
          status: $(e.target).html()
        }
      });
    }
    return tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle');
  },
  'autocompleteselect input[name=customStatus]': function(e, tpl, doc) {
    Tickets.update(tpl.data.ticketId, {
      $set: {
        status: doc.name
      }
    });
    $(e.target).val("");
    return tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle');
  },
  'keyup input[name=customStatus]': function(e, tpl) {
    if (e.which === 13) {
      Tickets.update(tpl.data.ticketId, {
        $set: {
          status: $(e.target).val()
        }
      });
      $(e.target).val("");
      return tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle');
    }
  },

  /* Uploading files. */
  'click a[data-action=uploadFile]': function(e, tpl) {
    return Media.pickLocalFile(function(fileId) {
      console.log("Uploaded a file, got _id: ", fileId);
      Tickets.update(this.ticketId, {
        $addToSet: {
          attachmentIds: fileId
        }
      });
      return Meteor.call('setFlag', Meteor.userId(), this.ticketId, 'attachment', true);
    });
  }
});

function addNote(e, tpl, admin, internal) {
  var body, hashtags, status, ticket, users;
  if (!admin) {
    internal = false;
  }
  ticket = Tickets.findOne(tpl.data.ticketId);
  body = tpl.$('textarea[name=newNote]').val();
  hashtags = Parsers.getTags(body);
  users = Parsers.getUserIds(body);
  if ((users != null ? users.length : void 0) > 0) {
    if (!admin) {
      users = _.filter(users, function(u) {
        return Queues.findOne({
          name: ticket.queueName,
          memberIds: u
        }) == null;
      });
    }
    Tickets.update(tpl.data.ticketId, {
      $addToSet: {
        associatedUserIds: {
          $each: users
        }
      }
    });
  }
  if ((hashtags != null ? hashtags.length : void 0) > 0) {
    Tickets.update(tpl.data.ticketId, {
      $addToSet: {
        tags: {
          $each: hashtags
        }
      }
    });
  }
  if (admin) {
    status = Parsers.getStatuses(body);
    if ((status != null ? status.length : void 0) > 0) {
      Tickets.update(tpl.data.ticketId, {
        $set: {
          status: status[0]
        }
      });
    }
  }
  if (body) {
    Changelog.insert({
      ticketId: tpl.data.ticketId,
      timestamp: new Date(),
      authorId: Meteor.userId(),
      authorName: Meteor.user().username,
      internal: internal,
      type: "note",
      message: body
    });
  }
  Meteor.call('setFlag', Meteor.userId(), tpl.data.ticketId, 'replied', true);
  tpl.$('textarea[name=newNote]').val('');
  tpl.$('button[name=addNoteAndReOpen]').text("Re-Open Ticket");
  return tpl.$('button[name=addNoteAndClose]').text("Close Ticket");
};

Template.ticketTag.events({
  'click a[data-action=removeTag]': function(e, tpl) {
    var ticketId;
    e.preventDefault();
    ticketId = Template.parentData(1)._id;
    return Tickets.update({
      _id: ticketId
    }, {
      $pull: {
        tags: this.valueOf()
      }
    });
  },
  'click a[data-action=addTagFilter]': function(e, tpl) {
    var filter, ref, value;
    e.preventDefault();
    value = this.valueOf();
    filter = ((ref = Iron.query.get('tag')) != null ? ref.split(',') : void 0) || [];
    if (!(filter.indexOf(value) > -1)) {
      filter.push(value);
    }
    return Iron.query.set('tag', filter.join());
  }
});

Template.ticketHeadingPanels.helpers({
  queueMember: function() {
    var ref;
    return _.contains((ref = Queues.findOne({
      name: this.queueName
    })) != null ? ref.memberIds : void 0, Meteor.userId());
  },
  submittedByOther: function() {
    return this.submittedByUserId && this.authorId !== this.submittedByUserId;
  },
  author: function() {
    return Meteor.users.findOne({
      _id: this.authorId
    });
  }
});

Template.ticketHeadingPanels.events({
  'click a[name="changeQueue"]': function(e, tpl) {
    Blaze.renderWithData(Template.sendToAnotherQueueModal, {
      ticketId: this._id
    }, $('body').get(0));
    return $('#sendToAnotherQueueModal').modal('show');
  }
});

Template.formFieldsPanel.onCreated(function() {
  return this.panelIsCollapsed = new ReactiveVar(true);
});

Template.formFieldsPanel.helpers({
  collapsed: function() {
    return Template.instance().panelIsCollapsed.get();
  }
});

Template.formFieldsPanel.events({
  'show.bs.collapse': function(e, tpl) {
    return tpl.panelIsCollapsed.set(false);
  },
  'hide.bs.collapse': function(e, tpl) {
    return tpl.panelIsCollapsed.set(true);
  }
});
