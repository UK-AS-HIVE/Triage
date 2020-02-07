limit = Meteor.settings.public?.pageLimit || 20
offset = Meteor.settings.public?.offset || 20

Router.configure
  layoutTemplate: 'layout'
  loadingTemplate: 'loading'
  onBeforeAction: ->
    if Meteor.isClient and not Meteor.userId()
      @render 'login'
    else
      @next()

queueBeforeAction = (router, options) ->
  #check router, Object
  if options?.pseudoQueue then check options.pseudoQueue, String
  if options?.clearQueueBadge then check options.clearQueueBadge, Boolean
  #if options?.queueName then check options.queueName, String
  if options?.filterByUserId then check options.filterByUserId, Boolean

  Session.set 'queueName', if options?.pseudoQueue then null else options?.queueName
  Session.set 'pseudoQueue', options?.pseudoQueue || null
  Session.set 'offset', (Number(Iron.query.get('start')) || 0)

  queueName = options?.queueName
  Session.setDefault 'sortBy', 'submittedTimestamp'
  Session.setDefault 'sortDirection', -1

  router.next()
  if Meteor.userId()
    filter =
      queueName: queueName
      search: router.params.query.search
      status: router.params.query.status || '!Closed'
      tag: router.params.query.tag
      user: router.params.query.user
      associatedUser: router.params.query.associatedUser

    if options?.filterByUserId
      filter.userId = Meteor.userId()

    if Session.get('offset') < 1
      renderedTime = new Date()
      Meteor.subscribe 'newTickets', filter, renderedTime
    Meteor.subscribe 'tickets', filter, Session.get('sortBy'), Session.get('sortDirection'), Session.get('offset'), limit, {
      onReady: ->
        if options?.clearQueueBadge
          Meteor.call 'clearQueueBadge', queueName
        Session.set('ready', true)
      onStop: ->
        Session.set 'ready', false
    }
    setTimeout ->
      Session.set('ready', true)
    , 2000


Router.map ->
  @route 'stats',
    path: '/stats'
    template: 'ticketStats'

  @route 'default',
    path: '/'
    waitOn: -> Meteor.subscribe 'userData'
    action: ->
      queue = Meteor.user()?.defaultQueue || Queues.findOne({memberIds: Meteor.userId()})?.name
      if queue
        @redirect '/queue/'+encodeURIComponent(queue)
      else
        @redirect '/my/tickets'

  @route 'queue',
    path: '/queue/:queueName',
    onBeforeAction: ->
      queueBeforeAction @,
        queueName: @params.queueName
        pseudoQueue: null
        clearQueueBadge: true
        filterByUserId: false

  @route 'manageQueue',
    path: '/queue/:queueName/manage'
    onBeforeAction: ->
      queueBeforeAction @,
        queueName: @params.queueName
        pseudoQueue: null
        clearQueueBadge: false
        filterByUserId: false

  @route 'userQueue',
    path: '/my/tickets'
    template: 'queue'
    onBeforeAction: ->
      queueBeforeAction @,
        queueName: _.pluck(Queues.find().fetch(), 'name')
        pseudoQueue: 'userQueue'
        clearQueueBadge: false
        filterByUserId: true

  @route 'globalQueue',
    path: '/all/tickets'
    template: 'queue'
    onBeforeAction: ->
      queueBeforeAction @,
        queueName: _.pluck(Queues.find({memberIds: Meteor.userId()}).fetch(), 'name')
        pseudoQueue: 'globalQueue'
        clearQueueBadge: false
        filterByUserId: false

  @route 'ticket',
    path: '/ticket/:ticketNumber'
    template: 'ticket'
    onBeforeAction: ->
      Session.set 'ticketNumber', Number(@params.ticketNumber)
      @next()
      if Meteor.userId()
        Meteor.subscribe 'ticket', Number(@params.ticketNumber)

  @route 'userDashboard',
    path: '/my/dashboard'
    onBeforeAction: ->
      Session.set 'queueName', null
      Session.set 'pseudoQueue', null
      @next()

  @route 'apiSubmit',
    path: '/api/1.0/submit'
    where: 'server'
    action: ->
      # TODO: check X-Auth-Token header
      unless @request.headers['x-forwarded-for'] in Meteor.settings?.remoteWhitelist
        console.log 'API submit request from '+@request.headers['x-forwarded-for']+' not in API whitelist'
        throw new Meteor.Error 403,
          'Access denied.  Submit from a whitelisted IP address or use an API token.'

      console.log @request.body
      requiredParams = ['username', 'email', 'description', 'queueName']
      for k in requiredParams
        if not @request.body[k]? then throw new Meteor.Error 412, "Missing required parameter #{k} in request."

      Meteor.call 'checkUsername', @request.body.username


      blackboxKeys = _.difference(_.keys(@request.body), requiredParams.concat(['submitter_name', 'subject_line', 'on_behalf_of'], Tickets.simpleSchema()._schemaKeys))
      blackboxKeys = _.filter blackboxKeys, (k) =>
        @request.body[k].length
      formFields = _.pick(@request.body, blackboxKeys)
      username = /// \b#{@request.body.username}\b ///i

      associated = _.uniq _.map @request.body.associate?.split(/[^a-zA-Z0-9]+/), (u) ->
        if u.trim().length
          q = /// \b#{u}\b ///i
          Meteor.users.findOne({username: q})?._id

      associated = _.without associated, undefined

      ticket =
        title: @request.body.subject_line
        body: @request.body.description
        authorName: @request.body.username.toLowerCase()
        authorId: Meteor.users.findOne({username: username})._id
        associatedUserIds: associated
        submissionData:
          method: 'Form'
          ipAddress: @request.body.ip_address
          hostname: @request.body.hostname? @request.body.ip_address
        submittedTimestamp: Date.now()
        queueName: @request.body.queueName || 'Triage'
        tags: @request.body.tags?.split(/[;\n]/).map((t) => t.trim()).filter((t) => t.length) || []
        formFields: formFields
        attachmentIds: _.pluck(@request.files, '_id')

      if @request.body.on_behalf_of?.length
        ticket.formFields['Submitted by'] = ticket.authorName
        ticket.formFields['On behalf of'] = @request.body.on_behalf_of
        behalfOfId = try Meteor.call 'checkUsername', @request.body.on_behalf_of
        if behalfOfId
          ticket.submittedByUserId = ticket.authorId
          ticket.authorName = @request.body.on_behalf_of.toLowerCase()
          ticket.authorId = behalfOfId

      Tickets.insert ticket

      @response.end 'Submission successful.'

  @route 'serveFile',
    path: '/file/:filename'
    where: 'server'
    action: FileRegistry.serveFile

  @route 'downloadFile',
    path: '/download/:filename'
    where: 'server'
    action: FileRegistry.serveFile
      disposition: 'attachment'

