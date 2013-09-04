class AdUnitsController < ApplicationController

  def index
    @ad_units = AdUnit.all

    respond_to do |format|
      format.html # index.html.erb
      format.json { render json: @ad_units }
    end
  end

  def show
    @ad_unit = AdUnit.find(params[:id])

    respond_to do |format|
      format.html # show.html.erb
      format.json { render json: @ad_unit }
    end
  end

  def new
    @ad_unit = AdUnit.new(:site_id => params[:site_id])
    @site    = Site.find(@ad_unit.site_id)

    respond_to do |format|
      format.html # new.html.erb
      format.json { render json: @ad_unit }
    end
  end

  def edit
    @ad_unit = AdUnit.find(params[:id])
  end

  def create
    @ad_unit      = AdUnit.new(params[:ad_unit])
    @ad_unit.code = convert_dart_tag(params[:dart])
    @site         = Site.find(@ad_unit.site_id)

    respond_to do |format|
      if @ad_unit.save
        format.html { redirect_to edit_site_path(@ad_unit.site_id), notice: 'Ad unit was successfully created.' }
      else
        format.html { render action: "new" }
      end
    end
  end

  def update
    @ad_unit = AdUnit.find(params[:id])

    respond_to do |format|
      if @ad_unit.update_attributes(params[:ad_unit])
        format.html { redirect_to edit_site_path(@ad_unit.site_id), notice: 'Ad unit was successfully updated.' }
        format.json { head :no_content }
      else
        format.html { render action: "edit" }
        format.json { render json: @ad_unit.errors, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @ad_unit = AdUnit.find(params[:id])
    @ad_unit.destroy

    respond_to do |format|
      format.html { redirect_to ad_units_url }
      format.json { head :no_content }
    end
  end

  def instructions
    render layout: false
  end

  private

  def convert_dart_tag(html)
    breakdown = /src=\"(.*)\"/.match(html).to_s.split(/\//)

    if is_zone_present(breakdown)
      attributes = breakdown[6].to_s.split(/;/)
      ad_data    = {
          :network   => breakdown[3],
          :publisher => breakdown[5],
          :zonename  => attributes[0],
          :format    => attributes[1].to_s.gsub(/sz=/, '')
      }
    else
      attributes = breakdown[5].to_s.split(/;/)
      ad_data    = {
          :network   => breakdown[3],
          :publisher => attributes[0],
          :zonename  => nil,
          :format    => attributes[1].to_s.gsub(/sz=/, '')
      }
    end

    # build the div tag
    div  = "<div clickr-ad=\"true\""
    div << " clickr-format=\"#{ad_data[:format]}\""       if ad_data[:format]
    div << " clickr-zone=\"#{ad_data[:zonename]}\""       if ad_data[:zonename]
    div << " clickr-publisher=\"#{ad_data[:publisher]}\"" if ad_data[:publisher]
    div << " /></div>"
  end

  def is_zone_present(src)
    (src.length > 6)
  end

  def is_dart_tag(html)
    (html.include?('adj') && html.include?('adj') && html.include?('adj'))
  end

end
