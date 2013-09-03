class SitesController < ApplicationController

  def dash
    @sites = Site.all

    respond_to do |format|
      format.html # index.html.erb
      format.json { render json: @sites }
    end
  end

  def new
    @site = Site.new

    respond_to do |format|
      format.html # new.html.erb
      format.json { render json: @site }
    end
  end

  def edit
    @site     = Site.find(params[:id])
    @ad_units = AdUnit.find_all_by_site_id(params[:id])

  end

  def create
    @site           = Site.new(params[:site])
    @site.public_id = generate_public_id

    respond_to do |format|
      if @site.save
        format.html { redirect_to edit_site_path(@site), notice: 'Site was successfully created.' }
      else
        format.html { render action: "new" }
      end
    end
  end

  def update
    @site = Site.find(params[:id])

    respond_to do |format|
      if @site.update_attributes(params[:site])
        format.html { redirect_to edit_site_path(@site), notice: 'Site was successfully updated.' }
        format.json { head :no_content }
      else
        format.html { render action: "edit" }
        format.json { render json: @site.errors, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @site = Site.find(params[:id])
    @site.destroy

    respond_to do |format|
      format.html { redirect_to root_url }
      format.json { head :no_content }
    end
  end

  private

  def generate_public_id
    number = rand(10000..99999)
    record = Site.find_by_public_id(number)

    unless record.nil? # number already taken, generate a new one
      return generate_public_id
    end

    return number
  end

end
