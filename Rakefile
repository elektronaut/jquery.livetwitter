require 'rubygems'
require 'uglifier'

desc "Create minified version"
task :minify do
	minified = Uglifier.compile(File.read("jquery.livetwitter.js"))
	File.open('jquery.livetwitter.min.js', 'w') {|fh| fh.write minified}
end