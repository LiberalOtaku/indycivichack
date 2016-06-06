class PagesController < ApplicationController
  def index
  end

  def trip
    @bikestations = Bikestation.all
  end

  def report
    @bikestations = Bikestation.all
  end
end
