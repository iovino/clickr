class AdUnit < ActiveRecord::Base
  attr_accessible :code, :name, :site_id

  belongs_to :site

  validates :name, :presence => true
end
