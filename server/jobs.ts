import {Job} from 'meteor/differential:workers';

// Generated by CoffeeScript 1.12.7
(function() {
  var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  this.TextAggregateJob = (function(superClass) {
    extend(TextAggregateJob, superClass);

    function TextAggregateJob() {
      return TextAggregateJob.__super__.constructor.apply(this, arguments);
    }

    TextAggregateJob.prototype.handleJob = function() {
      return Tickets.direct.update(this.params.ticketId, {
        $addToSet: {
          additionalText: {
            $each: this.params.text
          }
        }
      });
    };

    return TextAggregateJob;

  })(Job);

}).call(this);
