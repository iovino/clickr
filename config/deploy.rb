require "rvm/capistrano"
require 'bundler/capistrano' # run bundler on the server
require 'capistrano/ext/multistage' # multi staging
require 'capistrano_colors'
require 'prompter'
require 'airbrake/capistrano'
load 'deploy/assets'

host = 'clickr.escalatemedia.com'

# get current git branch
def current_branch
  branch = `git symbolic-ref HEAD 2> /dev/null`.strip.gsub(/^refs\/heads\//, '')
  puts "Deploying branch #{branch}"
  branch
end

set  :deploy_to, "/home/app_user/#{host}"

# Repository
set :application, "clickr"
set :repository,  "git@github.com:EscalateMedia/clickr.git"
set :scm, 'git'
set :deploy_via, :remote_cache # delete cache if you rename git url
#set :copy_exclude, [ '.git' ]
set :keep_releases, 10         # max number of release
set :branch, current_branch    #
set :user, 'app_user'          #
set :ssh_options, { :forward_agent => true }

role :web, host                          # Your HTTP server, Apache/etc
role :app, host                          # This may be the same as your `Web` server
role :db,  host, :primary => true
#role :resque_worker, host

# if you want to clean up old releases on each deploy uncomment this:
after "deploy:restart", "deploy:cleanup"

namespace :deploy do
  task :start do ; end
  task :stop do ; end
  task :restart, :roles => :app, :except => { :no_release => true } do
    run "#{try_sudo} touch #{File.join(current_path,'tmp','restart.txt')}"
  end

  task :override_deployed_files, :roles => :app do
    run "cp -r #{release_path}/config/deploy/#{stage}/* #{release_path}"

    # rename ht* files to .ht* (i.e. htaccess)
    Dir.glob("config/deploy/#{stage}/**/ht*") do |file|
      source_file = "#{release_path}/#{file.gsub("config/deploy/#{stage}/", '')}"
      destination_file = source_file.gsub(File.basename(source_file), File.basename(source_file).prepend('.'))
      run "mv #{source_file} #{destination_file}"
    end

  end
end

# Update deploy order
after 'bundle:install', 'deploy:override_deployed_files'
after 'deploy:restart', 'deploy:cleanup'


