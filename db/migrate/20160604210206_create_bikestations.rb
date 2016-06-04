class CreateBikestations < ActiveRecord::Migration
  def change
    create_table :bikestations do |t|
      t.float :lat
      t.float :lon
      t.string :add
      t.string :name
      t.string :sid

      t.timestamps null: false
    end
  end
end
