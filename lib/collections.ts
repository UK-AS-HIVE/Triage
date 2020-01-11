import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';

export const UserStats = new Mongo.Collection('userStats');

export const TicketStats = new Mongo.Collection('ticketStats');

export const Tickets = new Mongo.Collection('tickets');

Tickets.attachSchema(new SimpleSchema({
  title: {
    label: "Title",
    type: String
  },
  body: {
    label: "Body",
    type: String
  },
  formFields: {
    label: "Form Fields",
    type: Object,
    blackbox: true,
    optional: true
  },
  authorId: {
    type: String
  },
  authorName: {
    type: String
  },
  status: {
    type: String,
    min: 1,
    defaultValue: 'Open'
  },
  tags: {
    defaultValue: [],
    optional: true,
    type: [String],
    min: 1
  },
  submissionData: {
    type: Object,
    optional: true
  },
  'submissionData.method': {
    optional: true,
    type: String,
    allowedValues: ['Web', 'Email', 'Form', 'Mobile']
  },
  'submissionData.ipAddress': {
    optional: true,
    type: String
  },
  'submissionData.hostname': {
    optional: true,
    type: String
  },
  submittedTimestamp: {
    type: new Date(),
    defaultValue: Date.now
  },
  lastUpdated: {
    type: new Date(),
    defaultValue: Date.now
  },
  timeToClose: {
    optional: true,
    type: Number,
    decimal: true
  },
  closedTimestamp: {
    optional: true,
    type: new Date()
  },
  closedByUserId: {
    optional: true,
    type: String,
    label: "Closed By - ID"
  },
  closedByUsername: {
    optional: true,
    type: String,
    label: "Closed By - Username"
  },
  queueName: {
    type: String
  },
  associatedUserIds: {
    optional: true,
    defaultValue: [],
    type: [String]
  },
  attachmentIds: {
    optional: true,
    type: [String]
  },
  ticketNumber: {
    type: Number,
    unique: true,
    optional: true
  },
  submittedByUserId: {
    type: String,
    optional: true
  },
  emailMessageIDs: {
    type: [String],
    optional: true
  },
  additionalText: {
    type: [String],
    optional: true
  }
}));

export const TicketFlags = new Mongo.Collection('ticketFlags');


/*@TicketFlags.attachSchema new SimpleSchema
  userId:
    type: String
  ticketId:
    type: String
  k:
    type: String
  v:
    type: Object
    blackbox: true
  */

export const Changelog = new Mongo.Collection('changelog');

Changelog.attachSchema(new SimpleSchema({
  ticketId: {
    type: String,
    label: "Ticket ID"
  },
  timestamp: {
    type: new Date(),
    label: "Timestamp"
  },
  authorId: {
    type: String,
    label: "Author ID",
    optional: true
  },
  authorName: {
    type: String,
    label: "Author Name",
    optional: true
  },
  authorEmail: {
    type: String,
    label: "Author Email address",
    optional: true
  },
  type: {
    type: String,
    allowedValues: ['note', 'field', 'attachment'],
    label: "Type"
  },
  field: {
    type: String,
    label: "Field",
    optional: true
  },
  message: {
    type: String,
    label: "Message",
    optional: true
  },
  oldValue: {
    type: String,
    label: "Old Value",
    optional: true
  },
  newValue: {
    type: String,
    label: "New Value",
    optional: true
  },
  otherId: {
    type: String,
    optional: true
  },
  internal: {
    type: Boolean,
    optional: true,
    defaultValue: false,
    label: "Internally Visible Only"
  }
}));

export const Queues = new Mongo.Collection('queues');

Queues.attachSchema(new SimpleSchema({
  name: {
    type: String,
    label: "Name"
  },
  memberIds: {
    type: [String],
    label: "Queue Members",
    optional: true
  },
  securityGroups: {
    type: [String],
    label: "Security Groups"
  },
  stats: {
    type: Object,
    optional: true
  },
  'stats.week.numSubmitted': {
    type: Number,
    optional: true
  },
  'stats.week.avgTimeToClose': {
    type: Number,
    optional: true,
    decimal: true
  },
  'stats.month.numSubmitted': {
    type: Number,
    optional: true
  },
  'stats.month.avgTimeToClose': {
    type: Number,
    optional: true,
    decimal: true
  },
  'stats.weeklyLeader.username': {
    type: String,
    optional: true
  },
  'stats.weeklyLeader.numClosed': {
    type: Number,
    optional: true
  },
  'stats.weeklyLeader.avgTimeToClose': {
    type: Number,
    optional: true,
    decimal: true
  },
  settings: {
    type: Object,
    optional: true
  },
  'settings.notifyOnAPISubmit': {
    type: Boolean,
    optional: true
  }
}));

const notificationSettingDefaults = {
  submitted: true,
  authorSelfNote: true,
  authorOtherNote: true,
  authorStatusChanged: true,
  authorAttachment: true,
  associatedSelfNote: true,
  associatedOtherNote: true,
  associatedStatusChanged: true,
  associatedAttachment: true,
  associatedWithTicket: true
};

Meteor.users.attachSchema(new SimpleSchema({
  username: {
    type: String,
    label: "Username"
  },
  defaultQueue: {
    type: String,
    optional: true,
    label: "Default Queue"
  },
  displayName: {
    type: String,
    optional: true,
    label: "Display Name"
  },
  employeeNumber: {
    type: String,
    optional: true,
    label: "Employee Number"
  },
  mail: {
    type: String,
    label: "Email Address"
  },
  emails: {
    type: [String],
    optional: true,
    label: "Additional Email Addresses"
  },
  memberOf: {
    type: [String],
    label: "Member Of",
    defaultValue: []
  },
  notificationSettings: {
    type: Object,
    defaultValue: notificationSettingDefaults
  },
  department: {
    type: String,
    optional: true
  },
  'notificationSettings.submitted': {
    type: Boolean
  },
  'notificationSettings.authorSelfNote': {
    type: Boolean
  },
  'notificationSettings.authorOtherNote': {
    type: Boolean
  },
  'notificationSettings.authorStatusChanged': {
    type: Boolean
  },
  'notificationSettings.authorAttachment': {
    type: Boolean
  },
  'notificationSettings.associatedSelfNote': {
    type: Boolean
  },
  'notificationSettings.associatedOtherNote': {
    type: Boolean
  },
  'notificationSettings.associatedStatusChanged': {
    type: Boolean
  },
  'notificationSettings.associatedAttachment': {
    type: Boolean
  },
  'notificationSettings.associatedWithTicket': {
    type: Boolean
  },
  physicalDeliveryOfficeName: {
    type: String,
    label: "Physical Delivery Office",
    optional: true
  },
  services: {
    type: Object,
    optional: true,
    blackbox: true
  },
  status: {
    type: Object,
    optional: true,
    blackbox: true
  },
  title: {
    optional: true,
    type: String,
    label: "Title"
  }
}));

export const Tags = new Mongo.Collection('tags');

Tags.attachSchema(new SimpleSchema({
  name: {
    type: String,
    unique: true
  },
  lastUse: {
    type: new Date()
  }
}));

export const Statuses = new Mongo.Collection('statuses');

Statuses.attachSchema(new SimpleSchema({
  name: {
    type: String,
    unique: true
  },
  lastUse: {
    type: new Date()
  }
}));

export const QueueBadgeCounts = new Mongo.Collection('queueBadgeCounts');
QueueBadgeCounts.attachSchema(new SimpleSchema({
  userId: {
    type: String,
    label: "User ID"
  },
  queueName: {
    type: String,
    label: "Queue Name"
  },
  count: {
    type: Number
  }
}));
