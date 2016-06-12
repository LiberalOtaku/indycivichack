class IssuesController < ApplicationController
  def index
  end

  def new
    @issue = Issue.new
  end

  def create
    @issue = Issue.new(issue_params)
    if @issue.save
      redirect_to index_path
    else
      render :create
    end
  end

  private

  def issue_params
    params.require(:issue).permit(:email, :message)
  end
end
