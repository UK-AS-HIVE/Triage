rootUrl = Meteor.absoluteUrl()
if rootUrl[rootUrl.length-1] == '/'
  rootUrl = rootUrl.substr(0, rootUrl.length-1)
fromEmail = Meteor.settings.email?.fromEmail || "triagebot@as.uky.edu"
fromDomain = fromEmail.split('@').pop()

makeMessageID = (ticketId) ->
  '<'+Date.now()+'.'+ticketId+'@'+fromDomain+'>'

# Sends notifications to users about ticket updates.
class @NotificationJob extends Job
  handleJob: ->
    ticketNumber = Tickets.findOne(@params.ticketId).ticketNumber
    html = @params.html + "<br><br><a href='#{rootUrl}/ticket/#{ticketNumber}'>View the ticket here.</a>"
    if @params.to or @params.bcc.length > 0
      Email.send
        from: @params.fromEmail || fromEmail
        to: @params.toEmail
        bcc: @params.bcc
        subject: @params.subject
        html: html
        headers:
          'Message-ID': makeMessageID @params.ticketId

# Adds additional text fields to a ticket for MongoDB text indexing. These fields are
# usually drawn from Changelog entries, but could be from any entity that references a ticket
# (e.g. OCR from attachments and attachment filenames).
class @TextAggregateJob extends Job
  handleJob: ->
    Tickets.direct.update @params.ticketId, { $addToSet: { additionalText: { $each: @params.text } } }
