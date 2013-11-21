class AddKruxControlTagToSites < ActiveRecord::Migration
  def change
    add_column :sites, :krux_control, :boolean
  end
end
