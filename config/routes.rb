Rails.application.routes.draw do
  root 'pages#index'
  get  'trip',          to: 'pages#trip',    as: :trip
  get  'issues/new',    to: 'issues#new',    as: :issue
  post 'issues/create', to: 'issues#create', as: :issue_create
end
