module ApplicationHelper

  def is_active_site(site)
    if params[:id]
      if params[:controller] == 'sites' && Integer(params[:id]) == site.id
          return " active"
      end

      if params[:controller] == 'ad_units'
        if AdUnit.find(params[:id]).site_id == site.id
          return " active"
        end
      end

    end

    if params[:site_id]
      if Integer(params[:site_id]) == site.id
        return " active"
      end
    end
  end
end
