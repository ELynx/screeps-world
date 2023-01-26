module.exports = function (grunt) {
  const env_vars = process.env

  grunt.loadNpmTasks('grunt-screeps')

  grunt.initConfig(
    {
      screeps:
        {
          options:
            {
              email: env_vars.PUSH_EMAIL,
              token: env_vars.PUSH_TOKEN,
              branch: env_vars.PUSH_BRANCH
            },
          dist:
            {
              src: ['dist/*.js']
            }
        }
    }
  )
}
