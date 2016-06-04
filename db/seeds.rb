# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)


require 'httparty'

url = 'https://gbfs.bcycle.com/bcycle_pacersbikeshare/station_information.json'
response = HTTParty.get(url)

response.parsed_response['data']['stations'].each do |s|
  Bikestation.create!(
    lat: s['lat'],
    lon: s['lon'],
    add: s['address'],
    name: s['name'],
    sid: s['station_id'],
  )
end
