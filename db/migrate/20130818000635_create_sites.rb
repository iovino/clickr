class CreateSites < ActiveRecord::Migration
  def change
    create_table :sites do |t|
      t.integer :public_id
      t.string :host
      t.string :analytics
      t.string :comscore
      t.string :krux

      t.timestamps
    end
    add_index :sites, :public_id
  end
end
