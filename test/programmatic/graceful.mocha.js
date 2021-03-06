
process.env.NODE_ENV = 'test';

var PM2    = require('../..');
var should = require('should');
var path   = require('path');
var Plan   = require('../helpers/plan.js');
var semver = require('semver');

process.chdir(__dirname);

describe('Wait ready / Graceful start / restart', function() {
  if (!semver.satisfies(process.version, '>= 4.0.0'))
    process.exit(0);

  var pm2 = new PM2.custom({
    cwd : '../fixtures/listen-timeout/',
    independent : true
  });

  after(function(done) {
    pm2.destroy(done)
  });

  describe('(FORK) Listen timeout feature', function() {
    this.timeout(10000);

    after(function(done) {
      pm2.delete('all', done);
    });

    it('should force script to set as ready after forced listen_timeout', function(done) {
      pm2.start({
        script         : './wait-ready.js',
        listen_timeout : 1000,
        wait_ready     : true,
        name           : 'echo'
      });

      setTimeout(function() {
        pm2.list(function(err, apps) {
          should(apps[0].pm2_env.status).eql('launching');
        });
      }, 800);

      setTimeout(function() {
        pm2.list(function(err, apps) {
          should(apps[0].pm2_env.status).eql('online');
          done();
        })
      }, 3000);
    });

    it('should have listen timeout updated', function(done) {
      pm2.list(function(err, list) {
        should(list[0].pm2_env.wait_ready).eql(true);
        done();
      });
    });

    it('should take listen timeout into account', function(done) {
      var called = false;
      var plan = new Plan(3, done);

      setTimeout(function() {
        should(called).be.false();
        plan.ok(true);
      }, 300);

      setTimeout(function() {
        should(called).be.true();
        plan.ok(true);
      }, 1500);

      pm2.reload('all', function(err, data) {
        called = true;
        plan.ok(true);
      });
    });

    it('should restart script with different listen timeout', function(done) {
      pm2.restart({
        script    : './echo.js',
        listen_timeout : 100,
        instances : 1,
        name      : 'echo'
      }, done);
    });

    it('should have listen timeout updated', function(done) {
      pm2.list(function(err, list) {
        should(list[0].pm2_env.listen_timeout).eql(100);
        should(list.length).eql(1);
        done();
      });
    });

    it('should be reloaded after 100ms', function(done) {
      var called = false;

      setTimeout(function() {
        should(called).be.true();
        done();
      }, 500);

      pm2.reload('all', function(err, data) {
        called = true;
      });
    });
  });


  describe('(CLUSTER) Listen timeout feature', function() {
    this.timeout(10000);

    after(function(done) {
      pm2.delete('all', done);
    });

    it('should force script to set as ready after forced listen_timeout', function(done) {
      pm2.start({
        script         : './wait-ready.js',
        listen_timeout : 1000,
        wait_ready     : true,
        instances      : 2,
        name           : 'echo'
      });

      setTimeout(function() {
        pm2.list(function(err, apps) {
          should(apps[0].pm2_env.status).eql('launching');
        });
      }, 800);

      setTimeout(function() {
        pm2.list(function(err, apps) {
          should(apps[0].pm2_env.status).eql('online');
          done();
        })
      }, 1500);
    });
  });

});
