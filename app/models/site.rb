class Site < ActiveRecord::Base
  attr_accessible :host, :public_id, :analytics, :comscore, :krux, :krux_control

  has_many :ad_units, :dependent => :destroy

  validates :host, presence: true
end
