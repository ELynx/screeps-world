module.exports = function(grunt)
{
    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig(
      {
        screeps:
        {
            options:
            {
                email:  grunt.config.get("PUSH_EMAIL"),
                token:  grunt.config.get("PUSH_TOKEN"),
                branch: grunt.config.get("PUSH_BRANCH")
            },
            dist:
            {
                src: ['dist/*.js']
            }
        }
      }
    );
}
