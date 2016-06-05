class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  before_action :the_stations
  protect_from_forgery with: :exception
  
  def the_stations
    @bikestations = Bikestation.all
  end
end
