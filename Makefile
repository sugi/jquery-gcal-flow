VERSION=$(shell coffee version.coffee)

all: jquery.gcal_flow.js jquery.gcal_flow.css

clean:
	rm -f *.js *.css *~ *.zip

%.js: %.coffee
	coffee -c $<

%.css: %.scss
	if scss $< > $@; then \
	  true; \
	else \
       	  rm -f $@; \
	  false; \
	fi

version: jquery.gcal_flow.js
	@echo $(VERSION)

dist: jquery.gcal_flow.js jquery.gcal_flow.css
	rm -f jquery-gcal-flow-$(VERSION).zip
	mkdir -p jquery-gcal-flow-$(VERSION)
	install -m 644 README.asciidoc *.html *.js *.css jquery-gcal-flow-$(VERSION)
	git archive --format=tar --prefix=jquery-gcal-flow-$(VERSION)/docs/ \
		gh-pages | tar --exclude=.gitignore --exclude=params.json -xf -
	zip -9r jquery-gcal-flow-$(VERSION).zip jquery-gcal-flow-$(VERSION)
	rm -r jquery-gcal-flow-$(VERSION)
.PHONY: version clean dist
