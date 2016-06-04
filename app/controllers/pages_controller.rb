class PagesController < ApplicationController
  def index
    @bikestations = Bikestation.all
  end
end
