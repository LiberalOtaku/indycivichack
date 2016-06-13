var trip = {
  init: function(formSelector) {
    this.form = $(formSelector);
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    this.form.submit(this.submitForm.bind(this));
  },

  submitForm: function(event) {
    event.preventDefault();
    var ul = $('ul.trip-details');
    ul.slideUp().html('');

    // get list of routes and times

    // for each route:
    ul.append(trip.buildRouteInfo(route));

    ul.slideDown();
  },

  buildRouteInfo: function(route) {
    return $('<li/>').html(' \
      // get route info and add html here
      ');
  },
};

trip.init('#tripForm');
