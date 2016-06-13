class Issue < ActiveRecord::Base
  validates :message, presence: true
end
