import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { ReactiveVar } from "meteor/reactive-var";

//const dc = require("/client/compatibility/dc.js");
//const crossfilter = require("/client/compatibility/crossfilter.js");
declare const dc : any;
declare const crossfilter : any;

Template.ticketStats.onCreated(function() {
  var tpl;
  this.ready = new ReactiveVar(false);
  this.ticketStats = new ReactiveVar([]);
  tpl = this;
  return Meteor.apply('getTicketsForStats', [], function(err, stats) {
    tpl.ticketStats.set(stats);
    return tpl.ready.set(true);
  });
});

Template.ticketStats.helpers({
  ready: function() {
    return Template.instance().ready.get();
  },
  noResults: function() {
    return Template.instance().ready.get() && !Template.instance().ticketStats.get().length;
  },
  stats: function() {
    return Template.instance().ticketStats.get();
  }
});

Template.ticketStats.events({
  'changeDate .input-daterange input': function(e, tpl) {
    if (e.date) {
      return Iron.query.set(tpl.$(e.target).data('filter'), moment(e.date).format('YYYY-MM-DD'));
    } else {
      return Iron.query.set(tpl.$(e.target).data('filter'), null);
    }
  },
  'click button[data-action=reset]': function() {
    dc.filterAll();
    return dc.redrawAll();
  }
});

Template.ticketStats.onRendered(function() {
  this.$('.input-daterange').datepicker({
    clearBtn: true,
    todayHighlight: true,
    format: 'yyyy-mm-dd'
  });

  /*
  @autorun =>
    @subscribe 'ticketStats',
      onReady: =>
        @ready.set true
      onStop: =>
        @ready.set false
    */
  return this.autorun((function(_this) {
    return function() {
      var add, all, closedByUserRowChart, closedByUsernameDim, closedByUsernameDim2, closedByUsernameGroup, closedGroup, closedPerDayDim, data, dataCount, dateFormat, dayDim, departmentDim, departmentGroup, departmentPieChart, initial, lineChart, margins, overTimeWidth, pieChartDiameter, queueDim, queueGroup, queueName, queuePieChart, rowChartWidth, stats, sub, submittedGroup, timeToCloseGroup, timeToCloseRowChart, tip, volumeChart;
      stats = _this.ticketStats.get();
      if (_this.ready.get() && (stats != null ? stats.length : void 0)) {
        data = crossfilter(stats);
        all = data.groupAll();
        dataCount = dc.dataCount('#data-count').dimension(data).group(all).html({
          some: "<strong>%filter-count</strong> selected out of <strong>%total-count</strong> tickets <a class='btn btn-default btn-xs' href='javascript:dc.filterAll(); dc.renderAll();' role='button'> Reset filters</a>",
          all: "<strong>%total-count</strong> tickets. Select a queue, user, or date range to filter."
        });
        dataCount.render();
        margins = {
          top: 20,
          left: 40,
          right: 10,
          bottom: 20
        };
        dateFormat = d3.time.format('%Y-%m-%d');
        dayDim = data.dimension(function(d) {
          return dateFormat.parse(dateFormat(d.submittedTimestamp));
        });
        submittedGroup = dayDim.group();
        closedPerDayDim = data.dimension(function(d) {
          return dateFormat.parse(dateFormat(d.closedTimestamp));
        });
        closedGroup = closedPerDayDim.group();
        closedByUsernameDim = data.dimension(function(d) {
          return d.closedByUsername;
        });
        closedByUsernameGroup = closedByUsernameDim.group();
        closedByUsernameDim2 = data.dimension(function(d) {
          return d.closedByUsername;
        });
        add = function(p, v) {
          p.count++;
          p.total += v.timeToClose;
          p.avg = p.total / p.count;
          return p;
        };
        sub = function(p, v) {
          p.count--;
          p.total -= v.timeToClose;
          if (p.count === 0) {
            p.avg = 0;
          } else {
            p.avg = p.total / p.count;
          }
          return p;
        };
        initial = function() {
          return {
            count: 0,
            total: 0,
            avg: 0
          };
        };
        timeToCloseGroup = closedByUsernameDim2.group().reduce(add, sub, initial);
        queueDim = data.dimension(function(d) {
          return d.queueName;
        });
        queueGroup = queueDim.group();
        departmentDim = data.dimension(function(d) {
          return d.submitterDepartment;
        });
        departmentGroup = departmentDim.group();
        overTimeWidth = window.innerWidth - 50;
        volumeChart = dc.barChart('#volume-chart').height(100).width(overTimeWidth).margins(margins).dimension(dayDim).group(submittedGroup).centerBar(true).gap(1).x(d3.time.scale().domain([new Date(2015, 6, 1), new Date()])).round(d3.time.day.round).alwaysUseRounding(true).xUnits(d3.time.day);
        volumeChart.render();
        lineChart = dc.compositeChart('#tickets-by-day');
        lineChart.width(overTimeWidth).height(200).transitionDuration(1000).margins(margins).dimension(dayDim).mouseZoomable(false).brushOn(false).x(d3.time.scale().domain([new Date(2015, 6, 1), new Date()])).round(d3.time.day.round).xUnits(d3.time.day).elasticY(true).legend(dc.legend().x(window.innerWidth - 400).y(10).itemHeight(13).gap(5)).renderHorizontalGridLines(true).compose([
          dc.lineChart(lineChart).group(submittedGroup, 'Tickets Submitted').colors('red').title(function(d) {
            return "";
          }), dc.lineChart(lineChart).group(closedGroup, 'Tickets Closed').colors('blue').title(function(d) {
            return "";
          })
        ]).rangeChart(volumeChart);
        lineChart.render();
        tip = d3.tip().attr('class', 'd3-tip').offset([-10, 0]).html(function(d) {
          return "<span style='color: #0b0'>" + d.data.value + "</span> " + d.layer + " on " + (moment(d.data.key).format('l'));
        });
        d3.selectAll('.dot').call(tip);
        d3.selectAll('.dot').on('mouseover', tip.show).on('mouseleave', tip.hide);
        pieChartDiameter = window.innerWidth / 6 - 50;
        if (window.innerWidth < 1200) {
          pieChartDiameter = window.innerWidth / 6;
        }
        queuePieChart = dc.pieChart("#tickets-by-queue");
        queuePieChart.height(pieChartDiameter).radius(pieChartDiameter / 2).dimension(queueDim).group(queueGroup).renderLabel(true).legend(dc.legend().legendText(function(d) {
          return d.name + " - " + d.data;
        }));
        queueName = Iron.query.get('queueName');
        if (queueName != null) {
          console.log('filtering queueDim to ' + queueName);
          queuePieChart.filter(queueName);
        }
        queuePieChart.render();
        departmentPieChart = dc.pieChart("#tickets-by-submitter-department");
        departmentPieChart.height(pieChartDiameter).radius(pieChartDiameter / 2).dimension(departmentDim).group(departmentGroup).renderLabel(true).slicesCap(10).legend(dc.legend().legendText(function(d) {
          return d.name + " - " + d.data;
        }));
        departmentPieChart.render();
        rowChartWidth = window.innerWidth / 2 - 50;
        closedByUserRowChart = dc.rowChart('#tickets-closed-by-user');
        closedByUserRowChart.width(rowChartWidth).height(600).margins(margins).dimension(closedByUsernameDim).group(closedByUsernameGroup).label(function(d) {
          return d.key + " - " + d.value;
        }).elasticX(true).ordering(function(d) {
          return -d.value;
        });
        closedByUserRowChart.render();
        closedByUserRowChart.turnOnControls(true);
        timeToCloseRowChart = dc.rowChart('#time-to-close-by-user');
        timeToCloseRowChart.width(rowChartWidth).height(600).margins(margins).dimension(closedByUsernameDim2).group(timeToCloseGroup).valueAccessor(function(d) {
          return d.value.avg;
        }).elasticX(true).label(function(d) {
          return d.key + " - " + secondsToString(d.value.avg);
        }).ordering(function(d) {
          return -d.value.avg;
        }).xAxis().ticks(4).tickFormat(function(h) {
          return secondsToString(h);
        });
        timeToCloseRowChart.render();
        return timeToCloseRowChart.turnOnControls(true);
      }
    };
  })(this));
});

function secondsToString(seconds) {
  var days, hours, minutes, months, weeks;
  minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes + " minutes";
  }
  hours = Math.floor(minutes / 60);
  minutes -= 60 * hours;
  if (hours < 24) {
    return hours + " hours " + minutes + " minutes";
  }
  days = Math.floor(hours / 24);
  hours -= 24 * days;
  if (days < 7) {
    return days + " days " + hours + " hours";
  }
  weeks = Math.floor(days / 7);
  days -= 7 * weeks;
  if (weeks < 4) {
    return weeks + " weeks " + days + " days";
  }
  months = Math.floor(weeks / 4);
  weeks -= 4 * months;
  return months + " months " + weeks + " weeks";
};
