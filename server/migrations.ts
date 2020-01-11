import {Meteor} from 'meteor/meteor';
import {Migrations} from 'meteor/percolate:migrations';

Migrations.add({
  version: 1,
  up: function() {
    return Tickets.update({
      associatedUserIds: {
        $exists: false
      }
    }, {
      $set: {
        associatedUserIds: []
      }
    }, {
      multi: true
    });
  }
});

Migrations.add({
  version: 2,
  up: function() {
    return _.each(Tickets.find().fetch(), function(doc) {
      var author;
      author = Meteor.users.findOne(doc.authorId);
      return Tickets.update(doc._id, {
        $addToSet: {
          additionalText: {
            $each: [author != null ? author.displayName : void 0, author != null ? author.department : void 0]
          }
        }
      });
    });
  }
});

Migrations.add({
  version: 3,
  up: function() {
    return _.each(Tickets.find({
      timeToClose: {
        $exists: true
      },
      closedTimestamp: {
        $exists: false
      }
    }).fetch(), function(doc) {
      return Tickets.update(doc._id, {
        $set: {
          closedTimestamp: new Date(doc.submittedTimestamp.getTime() + doc.timeToClose * 1000)
        }
      });
    });
  }
});

Migrations.add({
  version: 4,
  up: function() {
    return _.each(Tickets.find().fetch(), function(doc) {
      return Tickets.direct.update(doc._id, {
        $addToSet: {
          additionalText: doc.ticketNumber.toString()
        }
      });
    });
  }
});

Migrations.add({
  version: 5,
  up: function() {
    return Tickets.find().forEach(function(doc) {
      var ref;
      return Tickets.direct.update(doc._id, {
        $set: {
          lastUpdated: ((ref = Changelog.findOne({
            ticketId: doc._id
          }, {
            sort: {
              timestamp: -1
            }
          })) != null ? ref.timestamp : void 0) || doc.submittedTimestamp
        }
      });
    });
  }
});

Migrations.add({
  version: 6,
  up: function() {
    var e;
    try {
      Tickets._dropIndex("title_text_body_text_additionalText_text_authorName_text_ticketNumber_text_formFields_text");
    } catch (error) {
      e = error;
      console.log(e);
    }
    return Tickets._ensureIndex({
      "$**": "text"
    });
  },
  down: function() {
    var e;
    try {
      Tickets._dropIndex("$**_text");
    } catch (error) {
      e = error;
      console.log(e);
    }
    return Tickets._ensureIndex({
      title: "text",
      body: "text",
      additionalText: "text",
      authorName: "text",
      ticketNumber: "text",
      formFields: "text"
    });
  }
});

Meteor.startup(function() {
  return Migrations.migrateTo(6);
});
