class CreateAdUnits < ActiveRecord::Migration
  def change
    create_table :ad_units do |t|
      t.integer :site_id
      t.string :name
      t.string :code

      t.timestamps
    end
  end
end
