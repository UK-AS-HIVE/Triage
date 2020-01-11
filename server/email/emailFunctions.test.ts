import { EmailIngestion } from "meteor/hive:email-ingestion";

import {it, describe} from "meteor/practicalmeteor:mocha";
import { expect } from "chai";

import _ from 'underscore';

import { TriageEmailFunctions } from './emailFunctions';


const mailObjs = [
  {
    "subject": "RE: Triage ticket #27 submitted: Email test ticket",
    "attachments": [],
    "body": "hi\n\n \n\nFrom: Paddock, Michael D \nSent: Wednesday, October 21, 2015 1:11 PM\nTo: triagebot@meteordev.as.uky.edu\nCc: Condley, Sarah G <Sarah.Condley@uky.edu>\nSubject: Re: Triage ticket #27 submitted: Email test ticket\n\n \n\nCC’ing Sarah\n\n \n\nFrom: \"triagebot@meteordev.as.uky.edu\"\nDate: Wednesday, October 21, 2015 at 1:08 PM\nSubject: Triage ticket #27 submitted: Email test ticket\n\n \n\nYou submitted ticket #27 with body:\nEmail test ticket\n\nView the ticket here.\n\n",
    "headers": {
      "received": "from EX10MB02.ad.uky.edu ([fe80::8586:a4c1:ea7b:cbb]) by EX10HB03.ad.uky.edu ([128.163.187.78]) with mapi id 14.03.0248.002; Wed, 21 Oct 2015 13:15:37 -0400",
      "from": "\"Condley, Sarah G\" <Sarah.Condley@uky.edu>",
      "to": "\"Paddock, Michael D\" <michael.paddock@uky.edu>",
      "subject": "RE: Triage ticket #27 submitted: Email test ticket",
      "thread-topic": "Triage ticket #27 submitted: Email test ticket",
      "thread-index": "AQHRDCMRCvcAfACLtUexVi15Om3I+p52LqEAgAABRrA=",
      "date": "Wed, 21 Oct 2015 13:15:36 -0400",
      "message-id": "<7BD0BC7FBBC0684F99A1379828FEA9C24B24E266@ex10mb02.ad.uky.edu>",
      "references": "<462FA03A-FDB6-444A-BE50-75BA4D2BA88B@uky.edu> <1445447300268.5WARNR4xT8JLoThY9@meteordev.as.uky.edu>",
      "in-reply-to": "<462FA03A-FDB6-444A-BE50-75BA4D2BA88B@uky.edu>",
      "accept-language": "en-US",
      "content-language": "en-US",
      "x-ms-has-attach": "",
      "x-ms-exchange-organization-scl": "-1",
      "x-ms-tnef-correlator": "<7BD0BC7FBBC0684F99A1379828FEA9C24B24E266@ex10mb02.ad.uky.edu>",
      "mime-version": "1.0",
      "x-ms-exchange-organization-authsource": "EX10HB03.ad.uky.edu",
      "x-ms-exchange-organization-authas": "Internal",
      "x-ms-exchange-organization-authmechanism": "04",
      "x-originating-ip": "[128.163.16.200]",
      "content-type": "multipart/alternative; boundary=\"B_3528364707_492529968\""
    },
    "fromEmail": "Sarah.Condley@uky.edu",
    "toEmails": ["michael.paddock@uky.edu"]
  }, {
    "subject": "RE: Triage ticket #27 submitted: Email test ticket",
    "attachments": [],
    "body": "hi\n\n \n\nFrom: Paddock, Michael D \nSent: Wednesday, October 21, 2015 1:11 PM\nTo: triagebot@meteordev.as.uky.edu\nCc: Condley, Sarah G <Sarah.Condley@uky.edu>\nSubject: Re: Triage ticket #27 submitted: Email test ticket\n\n \n\nCC’ing Sarah\n\n \n\nFrom: \"triagebot@meteordev.as.uky.edu\"\nDate: Wednesday, October 21, 2015 at 1:08 PM\nSubject: Triage ticket #27 submitted: Email test ticket\n\n \n\nYou submitted ticket #27 with body:\nEmail test ticket\n\nView the ticket here.\n\n",
    "headers": {
      "received": "from EX10MB02.ad.uky.edu ([fe80::8586:a4c1:ea7b:cbb]) by EX10HB03.ad.uky.edu ([128.163.187.78]) with mapi id 14.03.0248.002; Wed, 21 Oct 2015 13:15:37 -0400",
      "from": "\"Condley, Sarah G\" <Sarah.Condley@uky.edu>",
      "to": "\"Paddock, Michael D\" <michael.paddock@uky.edu>",
      "subject": "RE: Triage ticket #27 submitted: Email test ticket",
      "thread-topic": "Triage ticket #27 submitted: Email test ticket",
      "thread-index": "AQHRDCMRCvcAfACLtUexVi15Om3I+p52LqEAgAABRrA=",
      "date": "Wed, 21 Oct 2015 13:15:36 -0400",
      "message-id": "<7BD0BC7FBBC0684F99A1379828FEA9C24B24E266@ex10mb02.ad.uky.edu>",
      "references": "<1445447300268.5WARNR4xT8JLoThY9@meteordev.as.uky.edu> <462FA03A-FDB6-444A-BE50-75BA4D2BA88B@uky.edu>",
      "in-reply-to": "<462FA03A-FDB6-444A-BE50-75BA4D2BA88B@uky.edu>",
      "accept-language": "en-US",
      "content-language": "en-US",
      "x-ms-has-attach": "",
      "x-ms-exchange-organization-scl": "-1",
      "x-ms-tnef-correlator": "<7BD0BC7FBBC0684F99A1379828FEA9C24B24E266@ex10mb02.ad.uky.edu>",
      "mime-version": "1.0",
      "x-ms-exchange-organization-authsource": "EX10HB03.ad.uky.edu",
      "x-ms-exchange-organization-authas": "Internal",
      "x-ms-exchange-organization-authmechanism": "04",
      "x-originating-ip": "[128.163.16.200]",
      "content-type": "multipart/alternative; boundary=\"B_3528364707_492529968\""
    },
    "fromEmail": "Sarah.Condley@uky.edu",
    "toEmails": ["michael.paddock@uky.edu"]
  }, {
    "subject": "RE: Triage ticket #27 submitted: Email test ticket",
    "attachments": [],
    "body": "hi\n\n \n\nFrom: Paddock, Michael D \nSent: Wednesday, October 21, 2015 1:11 PM\nTo: triagebot@meteordev.as.uky.edu\nCc: Condley, Sarah G <Sarah.Condley@uky.edu>\nSubject: Re: Triage ticket #27 submitted: Email test ticket\n\n \n\nCC’ing Sarah\n\n \n\nFrom: \"triagebot@meteordev.as.uky.edu\"\nDate: Wednesday, October 21, 2015 at 1:08 PM\nSubject: Triage ticket #27 submitted: Email test ticket\n\n \n\nYou submitted ticket #27 with body:\nEmail test ticket\n\nView the ticket here.\n\n",
    "headers": {
      "received": "from EX10MB02.ad.uky.edu ([fe80::8586:a4c1:ea7b:cbb]) by EX10HB03.ad.uky.edu ([128.163.187.78]) with mapi id 14.03.0248.002; Wed, 21 Oct 2015 13:15:37 -0400",
      "from": "\"Condley, Sarah G\" <Sarah.Condley@uky.edu>",
      "to": "\"Paddock, Michael D\" <michael.paddock@uky.edu>",
      "subject": "RE: Triage ticket #27 submitted: Email test ticket",
      "thread-topic": "Triage ticket #27 submitted: Email test ticket",
      "thread-index": "AQHRDCMRCvcAfACLtUexVi15Om3I+p52LqEAgAABRrA=",
      "date": "Wed, 21 Oct 2015 13:15:36 -0400",
      "message-id": "<7BD0BC7FBBC0684F99A1379828FEA9C24B24E266@ex10mb02.ad.uky.edu>",
      "references": "<462FA03A-FDB6-444A-BE50-75BA4D2BA88B@uky.edu>",
      "in-reply-to": "<1445447300268.5WARNR4xT8JLoThY9@meteordev.as.uky.edu>",
      "accept-language": "en-US",
      "content-language": "en-US",
      "x-ms-has-attach": "",
      "x-ms-exchange-organization-scl": "-1",
      "x-ms-tnef-correlator": "<7BD0BC7FBBC0684F99A1379828FEA9C24B24E266@ex10mb02.ad.uky.edu>",
      "mime-version": "1.0",
      "x-ms-exchange-organization-authsource": "EX10HB03.ad.uky.edu",
      "x-ms-exchange-organization-authas": "Internal",
      "x-ms-exchange-organization-authmechanism": "04",
      "x-originating-ip": "[128.163.16.200]",
      "content-type": "multipart/alternative; boundary=\"B_3528364707_492529968\""
    },
    "fromEmail": "Sarah.Condley@uky.edu",
    "toEmails": ["michael.paddock@uky.edu"]
  }
];

const ticketId = "5WARNR4xT8JLoThY9";

const Tickets = {
  findOne: function(id : string) {
    if (id === ticketId) {
      return {
        _id: ticketId,
        title: "An example ticket",
        authorId: 1,
        authorName: "mdpadd2",
        body: "This is an example ticket.",
        queueName: "App Dev",
        status: "Open",
        submittedByUserId: 1,
        submittedTimestamp: new Date(1445456273222),
        ticketNumber: 333
      };
    } else {
      return null;
    }
  }
};

describe('Email Ingestion', function() {
  it('getTicketId', function() {
    return _.each(mailObjs, function(m) {
      return expect(TriageEmailFunctions.getTicketId(m)).to.equal(ticketId);
    });
  });
  it('extractReplyFromBody', function() {
    return _.each(mailObjs, function(m) {
      return EmailIngestion.extractReplyFromBody(m.body);
    });
  });
});

