class Site < ActiveRecord::Base
  attr_accessible :host, :public_id, :analytics, :comscore, :krux, :krux_control

  has_many :ad_units, :dependent => :destroy

  validates :host, :analytics, :comscore, :krux, presence: true
  validates :analytics, format: { with: /\AUA-[0-9]+-[0-9]+\z/, message: "only allows letters" }
  validates :comscore, format: { with: /\A[0-9]+\z/, message: "only allows letters" }
  validates :comscore, length: { is: 7 }
  validates :krux, length: { is: 8 }
end
