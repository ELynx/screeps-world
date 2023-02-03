module.exports = function (grunt) {
  const envVars = process.env

  grunt.loadNpmTasks('grunt-screeps')

  grunt.initConfig(
    {
      screeps:
        {
          options:
            {
              email: envVars.PUSH_EMAIL,
              token: envVars.PUSH_TOKEN,
              branch: envVars.PUSH_BRANCH
            },
          dist:
            {
              src: [envVars.PUSH_WHAT]
            }
        }
    }
  )
}
