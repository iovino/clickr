Clickr::Application.routes.draw do

  root :to => "sites#dash"

  # ad units
  match 'ad_units/instructions' => 'ad_units#instructions', :as => :ad_units_instructions
  resources :ad_units

  # sites
  match 'sites/dfp' => 'sites#dfp', :as => :sites_dfp
  resources :sites

end
