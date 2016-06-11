var report = {
  init: function(formSelector, url) {
    this.form = $(formSelector);
    this.url = url;
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    this.form.submit(this.submitForm.bind(this));
  },

  submitForm: function(event) {
    event.preventDefault();
    var name = this.form.find('[name="name"]');
    var email = this.form.find('[name="email"]');
    var subject = this.form.find('[name="subject"]');
    var message = this.form.find('[name="message"]');
    $.ajax({
      url: this.url,
      method: 'post',
      contentType: "application/json",
      data: JSON.stringify({
        "issue": {
          "name": name.val(),
          "email": email.val(),
          "subject": subject.val(),
          "message": message.val(),
        }
      }),
      success: function(issue) {
        alert('Report successfully submitted!');
        name.val('').focus();
        email.val('');
        subject.val('');
        message.val('');
      },
      error: function(xhr, status, error) {
        alert('Oops, something went wrong (' + status + ': ' + error + ')! Please try again later.');
      },
    });
  },

};

report.init('#issueForm', '../json/issues.json');
