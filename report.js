var report = {
  init: function(formSelector) {
    this.form = document.querySelector(formSelector);
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    this.form.onsubmit = this.submitForm.bind(this);
  },

  submitForm: function(event) {
    event.preventDefault();
    var alert = document.querySelector('div.alert-area');
    alert.innerHTML = ' \
      <div class="alert alert-success" role="alert"> \
        Report successfully submitted! \
      </div>';

    this.form.reset();
    this.form.clientName.focus();
  },

};

report.init('#issueForm');
