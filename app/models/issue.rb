class Issue < ActiveRecord::Base
  validates :message, length: { in: 9..999 }
end
