pipeline {
  agent any

  environment {
    SLACK_CHANNEL = '#opensource-cicd'
  }

  stages {
    stage ('Start') {
      steps {
        sendNotifications('STARTED', SLACK_CHANNEL)
      }
    }
  }

  post {
    success {
      sendNotifications('SUCCESS', SLACK_CHANNEL)
    }
    failure {
      sendNotifications('FAILED', SLACK_CHANNEL)
    }
  }
}
