var trip = {
  init: function(formSelector) {
    this.form = document.querySelector(formSelector);
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    this.form.onsubmit = this.submitForm.bind(this);
  },

  submitForm: function(event) {
    event.preventDefault();
    var trips = document.querySelector('div.trip-area');
    trips.innerHTML += '';


  },

};

trip.init('#tripForm');
