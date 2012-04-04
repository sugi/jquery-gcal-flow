VERSION=$(shell coffee version.coffee)

all: jquery.gcal_flow.js jquery.gcal_flow.css

clean:
	rm -f *.js *.css

%.js: %.coffee
	coffee -c $<

%.css: %.scss
	scss $< > $@

version: jquery.gcal_flow.js
	@echo $(VERSION)

dist: jquery.gcal_flow.js jquery.gcal_flow.scss
	mkdir -p jquery-gcal-flow-$(VERSION)
	install -m 644 *.js *.css jquery-gcal-flow-$(VERSION)
	zip -9r jquery-gcal-flow-$(VERSION).zip jquery-gcal-flow-$(VERSION)
	rm -r jquery-gcal-flow-$(VERSION)

.PHONY: version clean
