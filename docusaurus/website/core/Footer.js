/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require("react")

class Footer extends React.Component {
  docUrl(doc, language) {
    const baseUrl = this.props.config.baseUrl
    return `${baseUrl}docs/${language ? `${language}/` : ""}${doc}`
  }

  pageUrl(doc, language) {
    const baseUrl = this.props.config.baseUrl
    return baseUrl + (language ? `${language}/` : "") + doc
  }

  render() {
    return (
      <footer className="nav-footer" id="footer">
        <section className="sitemap" style={{ justifyContent: "left" }}>
          <a href={this.props.config.baseUrl} className="nav-home">
            {this.props.config.footerIcon && (
              <img
                src={this.props.config.baseUrl + this.props.config.footerIcon}
                alt={this.props.config.title}
                width="66"
                height="58"
              />
            )}
          </a>
          <span style={{ color: "white" }}>
            N E X T P R E S S<br />
            <i>veryfast</i> development
            <br />
            {/* {this.props.config.copyright} */}
          </span>
        </section>
      </footer>
    )
  }
}

module.exports = Footer
