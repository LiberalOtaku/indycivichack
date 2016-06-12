class IssuesController < ApplicationController
  def index
  end

  def new
    @issue = Issue.new
  end

  def create
    @issue = Issue.new(issue_params)
    if @issue.save
      redirect_to root_path
    else
      render :new
    end
  end

  private

  def issue_params
    params.require(:issue).permit(:email, :message)
  end
end
