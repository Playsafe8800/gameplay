# README #

This README would normally document whatever steps are necessary to get your application up and running.

### What is this repository for? ###

* Quick summary
* Version
* [Learn Markdown](https://bitbucket.org/tutorials/markdowndemo)

### How do I get set up? ###

* Summary of set up
* Configuration
* Dependencies
* Database configuration
* How to run tests
* Deployment instructions

### Contribution guidelines ###

* Writing tests
* Code review
* Other guidelines

### Who do I talk to? ###

* Repo owner or admin
* Other community or team contact.
  
### close

 * sudo -u admin pm2 reload 0
 * curl 'localhost:5000/shutdown'

### Bullmq check newrelic
    SELECT count(*) FROM BullMQJobSuccess FACET  queue SINCE 30 minutes ago
    SELECT count(*) FROM BullMQJobFailure FACET queue SINCE 30 minutes ago